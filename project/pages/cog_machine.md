title: Just Another COG in the Machine
date: 2018-06-12

<h6>
  Lets build a lambda raster processing machine to build COGs and then serve them through programmatically managed WMS Services straight out of S3.
</h6>
<div class="blog_content">
  <h3>Backstory</h3>
  <p>
    TNRIS has a lot of historical imagery. It is the official archive for the State of Texas (and Texas is big). We're talking filiing cabinets, almost ceiling tall, filled with millions of physical aerial photos dating back almost a hundred years. They exist as a resource for anybody to come utilize. Although, naturally it is a little difficult to find what you're looking for (or at) as you sift through it all. Call me crazy but with today's technology I think the whole archive could be digital and freely available for the public to navigate, download, and view within a web map.
  </p>
  <p>
    Hell, if companies like Planet are processing and serving global satellite imagery on a daily basis I think a few millions black-n-white photos from a dirty basement is... <i class="italic">manageable</i>.
  </p>
  <p>
    Sure, it will be a lot of work but the hard part is getting it digital and georeferenced. If we can get a lambda raster processing machine up and running, we can make everything already digital immediately available. Then as every new photo frame gets scanned, it can be turned into a COG, cataloged, and served without any extensive work beyond the simple and conscious act of scanning (and georeferencing) the photo.
  </p>

  <h3>Processing Pipeline</h3>
  <p>
    The project github repo can be found here: <a href="https://github.com/TNRIS/lambda-s4">https://github.com/TNRIS/lambda-s4</a>
  </p>
  <p>
    So with the backstory in mind, I conceptualized the entire process as a series of lambda functions chained together. The project repo consists of numerous directories named to include their numerical order and function within the process. Each directory is a step in the engine and serves a specific functionality (which the next step is dependent upon). Inside the base of the repo is 'exploration_instructional.md' which is a super messy documentation of every command I ran as I was working out the process as a whole. I left it in there simply for reference to the raw tests and manual steps used to prove the concept before cleaning it all up for documented deployment.
  </p>
  <p>
    <ol>
      <li>RDC (Research and Distribution Center) employees upload scanned image to appropriate `.../scanned/...` directory in the tree for storage. In reality, the 'upload' is a copy/paste to a FUSE s3fs directory mounted s3 bucket. No other event happens; this is just to make available the raw, scanned image in case that is a desired product for clients to download.</li>
      <li>RDC employees upload georeferenced image to appropriate `.../georef/...` directory in the tree. In reality, the 'upload' is a copy/paste to a FUSE s3fs directory mounted s3 bucket. This triggers the first lambda function by an event wired to monitor the bucket for all tif extensions.</li>
      <li>The first lambda function `ls4-01-compress` runs generic DEFLATE compression on georeferenced tif and reuploads to same key but in a sub directory (environment variable defined). Then it invokes the second lambda directly (doesn't use event monitoring it's upload because you cannot duplicate trigger on mulitple lambdas and the output is also a .tif).</li>
        <ul>
          <li>Uses gdal_translate binary</li>
          <li>NodeJS 6.10 runtime</li>
          <li>Uploaded image key declares 'bw' or 'rgb' so the function uses different band declarations when calling the gdal translate command</li>
          <li>Environment Variables:<br/>
                <code style="white-space: pre-wrap;">gdalArgs='-co tiled=yes -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co NUM_THREADS=ALL_CPUS -co COMPRESS=DEFLATE -co PREDICTOR=2'</code> (gdal translate arguments)<br/>
                <code>uploadBucket='project-bucket-name'</code> (project bucket name)<br/>
                <code>uploadKeyAcl='private'</code> (output s3 upload acl)<br/>
                <code>bwBands='-b 1'</code> (band arguments for single band raster)<br/>
                <code>rgbBands='-b 1 -b 2 -b 3'</code> (band arguments for rgb raster)<br/>
                <code>georefSubDir='deflate/'</code> (subdirectory for key upload; must be same as ls4-02-overviews)</li>
        </ul>
      <li>The second lambda function `ls4-02-overviews` creates overviews on the compressed tif and dumps them alongside it in the sub directory (.ovr). This function has a sub directory environment variable which it verifies is part of the compressed tif key in order to run -- <b>this means the sub directory environment variable for both functions must be the same</b>. This triggers the third lambda function by an event wired to monitor the bucket for all ovr extensions.</li>
        <ul>
          <li>Uses gdaladdo binary</li>
          <li>NodeJS 6.10 runtime</li>
          <li>Environment Variables:<br/>
                <code>uploadBucket='project-bucket-name'</code> (project bucket name)<br/>
                <code>gdaladdoLayers='2 4 8 16 32 64'</code> (gdal addo layer arguments)<br/>
                <code>gdaladdoArgs='-r average -ro'</code> (gdal addo arguments)<br/>
                <code>georefSubDir='deflate/'</code> (subdirectory for key upload; must be same as ls4-02-overviews)</li>
        </ul>
      <li>The third lambda function `ls4-03-cog` creates the cloud optimized geotiff (COG) from tif and ovr in the sub directory. Then it invokes the fourth lambda directly (doesn't use event because you cannot duplicate trigger on mulitple lambdas and the output is also a .tif).</li>
        <ul>
          <li>Uses gdal_translate binary</li>
          <li>NodeJS 6.10 runtime</li>
          <li>Uploaded image key declares 'bw' or 'rgb' so the function uses different byte and compression tyeps when calling the gdal translate command</li>
          <li>Environment Variables:<br/>
                <code>uploadBucket='project-bucket-name'</code> (project bucket name)<br/>
                <code>uploadKeyAcl='public-read'</code> (output s3 upload acl)<br/>
                <code style="white-space: pre-wrap;">bwGdalArgs='-of GTiff -ot Byte -a_nodata 256 -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=DEFLATE -co COPY_SRC_OVERVIEWS=YES --config GDAL_TIFF_OVR_BLOCKSIZE 512'</code> (gdal translate arguments for single band raster)<br/>
                <code style="white-space: pre-wrap;">ncGdalArgs='-of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co PHOTOMETRIC=YCBCR -co COPY_SRC_OVERVIEWS=YES --config GDAL_TIFF_OVR_BLOCKSIZE 512'</code> (gdal translate arguments for rgb raster)<br/>
                <code>georefSubDir='deflate/'</code> (subdirectory for key upload; must be same as ls4-02-overviews)</li>
        </ul>
      <li>The fourth lambda function `ls4-04-shp_index` creates the shapefile tile index of all COGs in s3 for the collection and drops it off in s3. Then it uploads a copy of the tile index to a new table in a PostGIS RDS for the Mapserver mapfile to use. This function is special insofar as accessing the RDS; the RDS is within a VPC so the lambda function must be within the same VPC to access it (security!). When a lambda function is deployed within a VPC, it no longer has access to S3 except through a VPC Endpoint. So, a VPC endpoint is deployed alongside this function with the function, RDS, and endpoint all residing in (or pointing to) the same subnets. This function triggers the fifth lambda function by an event wired to monitor the bucket for all .shp extensions.</li>
        <ul>
          <li>Uses rasterio with ManyLinux Wheels</li>
          <li>python 3.6 runtime</li>
          <li>Environment Variables:<br/>
                <code>DB_DRIVER='postgresql'</code> (sqlalchemy database driver)<br/>
                <code>DB_NAME='database-name'</code> (database name)<br/>
                <code>DB_USER='username'</code> (user with table create, drop, and update permissions)<br/>
                <code>DB_PASSWORD='password'</code> (user password)<br/>
                <code>DB_HOST='host connection url'</code> (RDS host url)<br/>
                <code>DB_PORT='5432'</code> (database port. postgres default is 5432)</li>
        </ul>
      <li>The fifth lambda function `ls4-05-mapfile` creates the mapfile for the collection and drops it off in s3. This is accomplished by using a template ('template.map') mapfile previously setup for WMS with placeholders for python to overwrite with the specifics related to the collection. Placeholders are variable names surrounded by less-than and greater-than carrots. Psycopg2 is used to query the collection's tile index in PostGIS for the 'EXTENT' x/y minimums and maximums. The mapfile does require an AWS user access key and secret access key. These are used to access s3 to retrieve the COGs. I setup a new user with only s3 permissions to the project for use in these mapfiles and by the Mapserver EC2 for mounting the bucket with FUSE s3fs (see below). Note: the mapfiles are uploaded with specific headers declaring the owner and permissions of the file so it can be read by Mapserver (see below).</li>
        <ul>
          <li>Uses standard python packages; no special binaries</li>
          <li>python 3.6 runtime</li>
          <li>Environment Variables:<br/>
                <code>DB_NAME='database-name'</code> (database name)<br/>
                <code>DB_USER='username'</code> (user with table create, drop, and update permissions)<br/>
                <code>DB_PASSWORD='password'</code> (user password)<br/>
                <code>DB_HOST='host connection url'</code> (RDS host url)<br/>
                <code>DB_PORT='5432'</code> (database port. postgres default is 5432)<br/>
                <code>MAPSERVER_ACCESS_KEY_ID=''</code> (mapserver user's access key id)<br/>
                <code>MAPSERVER_SECRET_ACCESS_KEY=''</code> (mapserver user's seecret access key)</li>
                <code>DNS_URL='http://server.yourdomain.com'</code> (mapserver instance dns url)</li>
        </ul>
    </ol>
  </p>

  <h3>Mapserver</h3>
  <p>
    Okee dokee, so the processing pipeline is setup and successfully converts individually uploaded image frames into COGS while continually regenerating (in order to update with new frames) the tile index of all frames and a mapfile to serve them out as a WMS Service. The other half of the project is the Mapserver to actually host the services by reading the mapfiles and serving out the COGs from s3. The step-by-step details of setting up such a Mapserver are outlined in my post <a href="../fuse_mapserver">FUSE s3 Mapserver</a> but here I'll just provide an overview of the main points to know and consider.
  </p>
  <p>
    <ul>
      <li>Started with an Amazon OS ECS Optimized AMI with Docker since I would be running Mapserver within a container. Originally spun up a basic micro EC2 for testing but once all the kinks were worked out, I re-provisioned a new AMI for use with ECS and spun up a new cluster to utilize it.</li>
      <li><a href="https://cloudkul.com/blog/mounting-s3-bucket-linux-ec2-instance/">Used these basic instructions</a> to install fuse and mount s3 as a drive on the machine.</li>
      <li>FUSE s3fs uses an IAM User Key ID and Secret Key for permissions to connect to the s3 bucket so I created a user to represent the Mapserver. I created a custom permission policy to assign to this user with only permissions to read and write to only the project bucket. This user's key and secret can also be used in mapfiles for AWS bucket access to COGs.</li>
      <li>FUSE accesses the user key/secret with a <code>.passwd-s3fs</code> file located in the 'ec2-user' home directory. When setting up this file, be sure to <code>chown</code> the file to the 'ec2-user' user. <a href="https://github.com/s3fs-fuse/s3fs-fuse/wiki/Fuse-Over-Amazon">Permissions instructions here</a>.</li>
      <li>You'll have to sudo edit <code>/etc/fuse.conf</code> to uncomment out the 'user_allow_other' line to permit machine users to access the mounted s3 directory.</li>
      <li>You'll want to setup the directory to automatically mount on machine bootup. Probably good practice if managing a single EC2 but definitely a requirement if setting up an AMI for ECS since ECS machines may come and go. New ones will need the directory already mounted as they turn on.</li>
      <li>s3 is an object store but FUSE s3fs mounts as a directory and recognizes 'folders'. Therefore, the 'directory' where the mapfiles reside in the s3 bucket must be owned by the os user ('ec2-user') running the docker container. This is accomplished by mounting the bucket, then doing a simple <code>mkdir</code> to create the folder rather than creating it in the AWS Console (which creates them as 'root').</li>
      <li>Same as the mapfile directory owner, the actual '.map' mapfiles need to be owned by 'ec2-user' and have the proper permissions. Since we are creating our mapfiles programatically, this is accomplished by using the proper headers when uploaded to s3 within function 5 `ls4-05-mapfile`. Boto3 is used to accomplish this:
      <code style="display:block;white-space: pre-wrap;text-transform:none;">
    import boto3
    s3 = boto3.resource('s3')

    bucket_name = '<-- bucket name -->'
    upload_file = '/<-- path to file -->/<-- filename -->.map'
    upload_key = '<-- upload key with filename including .map -->' # example: 'testt/test2.map'
    s3.Bucket(bucket_name).upload_file(upload_file,upload_key,ExtraArgs={'Metadata':{'mode':'33204','uid':'500','gid':'500','mtime':'1528814551'}})
      </code>
      It is within the ExtraArgs - Metadata that we can apply the required 'mode', 'uid', 'gid', and 'mtime' of the uploaded mapfile. The user and group IDs (uid, gid) should be that of the OS user 'ec2-user'. It seems standard and reliable to me that Amazon OS default user 'ec2-user' is UID and GID <code>500</code>.
      </li>
      <li>Spin up mapserver docker with a <code>-v</code> volume flag passing the machine FUSE mounted directory to the docker. Example: <code style="white-space: pre-wrap;">sudo docker run --detach -v /home/ec2-user/<-- mounted bucket -->/<-- bucket folder -->:/mapfiles:ro --publish 8080:80 --name mapserver geodata/mapserver</code> After the docker is running, setup an error log file with these commands:
        <ol>
          <li><code>sudo docker exec mapserver touch /var/log/ms_error.log</code></li>
          <li><code>sudo docker exec mapserver chown www-data /var/log/ms_error.log</code></li>
          <li><code>sudo docker exec mapserver chmod 644 /var/log/ms_error.log</code></li>
          <li>Then you can use <code>sudo docker exec mapserver cat /var/log/ms_error.log</code> to view the logs</li>
        </ol>
      </li>
      <li>Alternative to the previous point, create a custom docker image to utilize (opposed to DockerHub's "geodata/mapserver") which already has the error log file already provisioned. This is required if deploying to ECS.</li>
      <li><a href="https://github.com/TNRIS/lambda-s4/blob/master/ls4-05-mapfile/template.map">Template WMS Service Mapfile</a></li>
    </ul>
  </p>

  <h3>AWS Architecture</h3>
  <p>
    <ul>
      <li>s3 bucket which holds the rasters/COGs, tile index shapfiles, and mapfiles.</li>
      <li>Mapserver docker instance (some details above but <a href="../fuse_mapserver">super details here</a>). Initially for discovery and testing, the docker was spun up on a plain AWS OS EC2 and when it was completely configured it was the basis for the custom AMI to be used by ECS. In production, use a MapServer docker running in ECS on an EC2 with custom AMI that has a FUSE s3fs pointing a directory at the COG/Mapfile s3 bucket. This includes:
        <ul>
          <li>ECS Cluster running necessary machine (we use r3 large) with custom AMI</li>
          <li>ECS Service in the cluster with a task definiton containing the proper port mappings from the machine to the docker, proper mounted /mapfile volume, and custom docker image</li>
          <li>Elastic Load Balancer pointing http traffic to the cluster machines</li>
          <li>DNS record pointing toward the Elastic Load Balancer</li>
          <li>ECR (container registry) to store custom docker image if using ECS</li>
        </ul>
      </li>
      <li>IAM User with policy permissions to project s3 bucket for MapServer to use. Generate an Access Key ID and Secret Access Key for use as environment variables in function `ls4-05-mapfile`.</li>
      <li>Lambda IAM Role with full Lambda permissions and full s3 permissions to the project s3 bucket. Apply this role to every lambda function being mindful that function 4 is inside the VPC and needs additional subnet & VPC endpoint configuration.</li>
      <li>VPC Endpoint for Function 4 for s3 access since it is deployed within VPC to access RDS.</li>
      <li>Lambda function for each step in the process with appropriate environment variables, role, and event triggers as outlined above.</li>
      <li>Postgres RDS provisioned with PostGIS installed and a user for the lambda functions to utilize. The user should be granted permissions to create and alter tables and maintain ownership of the spatial_ref_sys PostGIS table.</li>
      <li>Appropriate networking and security amongst these cloud services will be required; the details of which I will not go through here, sorry.</li>
    </ul>
  </p>

  <h3>Hurdles</h3>
  <p>
    The main hurdles that needed ironing out were:
    <ul>
      <li>s3 key structures which organize the tifs so that scanners/georeferencers can drop off new images and the process can consistently handle them.</li>
      <li>setting up FUSE s3fs such that scanners/georeferencers can just drop off new images <i class="italic">in a folder</i> to let the process do it's thing. setting this up also lets the host mapserver use s3 for all the mapfiles. by hosting mapfiles from s3, the process can create new mapfiles and put them in a specific key structure which the mapserver automatically reads without redeployment of any kind. in short: new image uploaded = autmatically created new WMS. I detailed the process of creating this Mapserver in my post <a href="../fuse_mapserver">FUSE s3 Mapserver</a>.</li>
      <li>almost the entire process uses GDAL binaries. this is a major issue when it comes to serverless lambda as the size of these binaries are waaaaaay too large for the compressed 50 MB function upload limit (or 250 MB uncompressed via the more forgiving s3 route).<br />The first part of the process used indepedent GDAL Translate and GDAL Addo binaries, precompiled and supplied by Mark Korver (shoutout below) which allow the tif to COG conversion to be possible. These binaries are available and can be snatched from the function directory folder inside it's '/bin' subfolder.<br />The second part of the process uses Rasterio with ManyLinux Wheels to do a python version of gdaltindex to create the tile index (shoutout below). Luckily, a rasterio python package has been in development to incorporate them - this was a life saving necessity. The package was still too large to deploy though until I read Seth Fitzsimmons' (shoutout below) clever hack to remove all unused python dependency files and shrink the deployment. I expanded on Seth's instruction with details and specific commands in my post <a href="../lambda_shrinkage">Got Shrinkage?</a>.</li>
    </ul>
    Details related to the s3 key structure (repo wiki), setting up FUSE s3fs, Rasterio with ManyLinux Wheels, and shrinking of the lambda function for deployment can be found in the github repo README.
  </p>

  <h3>Shout Outs</h3>
  <p>
    <ul>
      <li>This process is extensively credited to <a href="https://github.com/mwkorver">Mark Korver</a> of AWS and his initial series of lambda functions to process tifs and create COGs. He has presented this process several times including <a href="https://2018.foss4g-na.org/">FOSS4G NA</a> and the <a href="https://tnris.org/georodeo/2018/">Texas GeoRodeo</a>. His initial workshop to outline the process, with links to the sample functions (used as the base of this project), can be found <a href="https://github.com/mwkorver/lambda-gdal_translate-cli">here</a>.</li>
      <li>A <a href="https://github.com/mapbox/rasterio/issues/942">Rasterio python package with ManyLinux Wheels</a> was an absolute necessity! Thanks to everyone making that a reality!</li>
      <li>Also due much credit, is <a href="https://github.com/mojodna">Seth Fitzsimmons</a> who is doing a ton of innovation with raster processing, hosting tiles from s3, and using lambda to do it. His code has been an excellent source of inspiration. His blog post on <a href="https://medium.com/@mojodna/slimming-down-lambda-deployment-zips-b3f6083a1dff">Slimming Down Lambda Deployment Zips</a> was a real ground breaker for keeping this whole project serverless.</li>
    </ul>
  </p>
</div>
