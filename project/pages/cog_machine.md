title: Just Another COG in the Machine
date: 2018-06-12 21:30:00

<h6>
  Lets build a lambda raster processing machine to build COGs and then serve them through programmatically managed WMS Services straight out of S3.
</h6>
<div class="blog_content">
  <h3>Backstory</h3>
  <p>
    TNRIS has a lot of historical imagery. It is the official archive for the State of Texas (and Texas is big). We're talking filiing cabinets, almost ceiling tall, filled with millions of physical aerial photos dating back almost a hundred years. They exist as a resource for anybody to come utilize. Although, naturally it is a little difficult to find what you're looking for (or at) as you sift through it all. Call me crazy but with today's technology I think the whole archive could be digital and freely available for the public to navigate, download, and view within a web map.
  </p>
  <p>
    Hell, if companies like Planet are processing and serving global satellite imagery on a daily basis I think a few millions black-n-white photos from a dirty basement is... <i>manageable</i>.
  </p>
  <p>
    Sure, it will be a lot of work but the hard part is getting it digital and georeferenced. If we can get a lambda raster processing machine up and running, we can make everything already digital immediately available. Then as every new photo frame gets scanned, it can be turned into a COG, cataloged, and served without any extensive work beyond the simple and conscious act of scanning (and georeferencing) the photo.
  </p>

  <h3>Project</h3>
  <p>
    The project github repo can be found here: <a href="https://github.com/TNRIS/lambda-s4">https://github.com/TNRIS/lambda-s4</a>
  </p>
  <p>
    So with the backstory in mind, I conceptualized the entire process as a series of lambda functions chained together. The project repo consists of numerous directories named with their numerical order within the process. Each directory is a step in the engine and serves a specific functionality and which the next step is dependent upon. Inside the base of the repo is 'exploration_instructional.md' which is a super messy documentation of every command I ran as I was working out the process as a whole. I left it in there simply for reference to the raw tests and manual steps used to prove the concept before cleaning it all up for clean, documented deployment.
  </p>

  <h3>Hurdles</h3>
  <p>
    The main hurdles that needed ironing out were:
    <ul>
      <li>s3 key structures which organize the tifs so that scanners/georeferencers can drop off new images and the process can consistently handle them.</li>
      <li>setting up FUSE s3fs such that scanners/georeferencers can just drop off new images <i>in a folder</i> to let the process do it's thing. setting this up also lets the host mapserver use s3 for all the mapfiles. by hosting mapfiles from s3, the process can create new mapfiles and put them in a specific key structure which the mapserver automatically reads without redeployment of any kind. in short: new image uploaded = autmatically created new WMS</li>
      <li>almost the entire process uses GDAL binaries. this is a major issue when it comes to serverless lambda as the size of these binaries are waaaaaay too large for the compressed 50 MB function upload limit (or 250 MB uncompressed via the more forgiving s3 route).<br />The first part of the process used indepedent GDAL Translate and GDAL Addo binaries, precompiled and supplied by Mark Korver (shoutout below) which  allow the tif to COG conversion to be possible.<br />The second part of the process uses Rasterio with ManyLinux Wheels to do a python version of gdaltindex to create the tile index (shoutout below). Luckily, a rasterio python package has been in development to incorporate them - this was a life saving necessity. The package was still too large to deploy though until I read Seth Fitzsimmons' (shoutout below) clever hack to remove all unused python dependency files and shrink the deployment.</li>
    </ul>
    Details related to the s3 key structure (repo wiki), setting up FUSE s3fs, Rasterio with ManyLinux Wheels, and shrinking of the lambda function for deployment can be found in the github repo README.
  </p>

  <h4> ------------ </h4>
  <h4>Sorry, but the process is still be explored and solidified so that i can come back here and give you all the details. Come back super soon and check it out!</h4>
  <h4> ------------ </h4>


  <h3>Shout Outs</h3>
  <p>
    <ul>
      <li>This process is extensively credited to <a href="https://github.com/mwkorver">Mark Korver</a> of AWS and his initial series of lambda functions to process tifs and create COGs. He has presented this process several times including <a href="https://2018.foss4g-na.org/">FOSS4G NA</a> and the <a href="https://tnris.org/georodeo/2018/">Texas GeoRodeo</a>. His initial workshop to outline the process, with links to the sample functions (used as the base of this project), can be found <a href="https://github.com/mwkorver/lambda-gdal_translate-cli">here</a>.</ul>
      <li>A <a href="https://github.com/mapbox/rasterio/issues/942">Rasterio python package with ManyLinux Wheels</a> was an absolute necessity! Thanks to everyone making that a reality!</ul>
      <li>Also due much credit, is <a href="https://github.com/mojodna">Seth Fitzsimmons</a> who is doing a ton of innovation with raster processing, hosting tiles from s3, and using lambda to do it. His code has been an excellent source of inspiration. His blog post on <a href="https://medium.com/@mojodna/slimming-down-lambda-deployment-zips-b3f6083a1dff">Slimming Down Lambda Deployment Zips</a> was a real ground breaker for keeping this whole project serverless.</ul>
    </ul>
  </p>
</div>
