title: Got Shrinkage? Rasterio and ManyLinux Wheels in Serverless Lambda
date: 2018-06-27 07:46:00

<h6>
  Rasterio with <a href="https://github.com/pypa/manylinux">ManyLinux Wheels</a> are super awesome! You can get the power and functionality of GDAL binaries compiled and packaged up to be on-the-go. Exactly what you need for serverless functions (lambda).
</h6>
<div class="blog_content">
  <h3>Backstory</h3>
  <p>
    I developed a <a href="./cog_machine">raster image processing pipeline</a> to convert TNRIS's huge historical archive from geotiffs into COGs served as WMS services from s3. A major hurdle in that project was getting what I was doing locally with 'gdaltindex' up into a serverless lambda function. I don't have any experience in any C languages and compiling an independent GDAL binary to deploy with the function code was out of reach for me. If I wrote the function in python, I could use Rasterio as the package utilizes GDAL but the package doesn't stand independently with GDAL inherent in it. The saving grace was when I came across <a href="https://github.com/mapbox/rasterio/issues/942">this</a> github issue which revealed to me I was not alone. Luckily, Mapbox was working on a Rasterio package utilizing ManyLinux wheels which compiled the GDAL binaries in the package.
  </p>
  <p>
    <code>pip install --pre rasterio[s3]>=1.0b4</code>
  </p>
  <p>
    I wrote my python function using this working version of Rasterio with the ManyLinux Wheels and it tested perfectly. Then came deployment which, surely enough, revealed another hurdle.
    <br/>
    When you deploy to lambda, you do so by uploading a zipfile with all the code and dependencies included. The zipfile must be < 50 MB. If it is larger, <a href="https://hackernoon.com/exploring-the-aws-lambda-deployment-limits-9a8384b0bec3">you can get away with uploading it to s3 and then directing lambda to it</a> but even then the package must be < 250 MB uncompressed.
  </p>
  <p>
    My package was originally: <code>7,716 items - 344.0 MB</code> ...or, waaaaaay too big.
  </p>
  <p>
    How do you shrink the deployment? Here comes <a href="https://github.com/mojodna">Seth Fitzsimmons</a> with a <a href="https://medium.com/@mojodna/slimming-down-lambda-deployment-zips-b3f6083a1dff">brillant blog post</a> about this very subject with these very dependencies. He cleverly outlined a process using 'atime' (modified/accessed file metadata) to track the individual files in the dependencies being used by the lambda function... from there, just delete the ones that are not being used. I followed his guidance to figure out the general steps to make it happen. I'm posting here to share the detailed commands and code I used to make it happen in hopes of providing some shortcuts to others.
  </p>
  <p>
    It was super successful with my output deployment package shrinking down to: <code>2,072 items - 154.0 MB (44 MB compressed!)</code>
  </p>

  <h3>How To Shrink the Package</h3>
  <p>
    Let's start with a directory that is ready for lambda deployment but is too large. In it is the lambda code and all the dependency packages. I'm working on Fedora 27 which has 'atime' disabled by default so the first thing I had to do was enable it. The simplest instruction I discovered to this was <a href="https://bugzilla.redhat.com/show_bug.cgi?id=75667">here</a>.
  </p>
  <ol>
    <li>
      <code>findmnt /boot</code> shows 'relatime' is enabled which blocks atime updates
    </li>
    <li>
      <code>mount -o remount,strictatime /boot</code> disables 'relatime' by enabling 'strictatime'
    </li>
    <li>
      <code>findmnt /boot</code> ran again proves 'relatime' is removed
    </li>
    <li>
      With 'atime' enabled, <code>cd</code> into the lambda function directory
    </li>
    <li>
      <code>touch start</code> to create an arbitrary file to compare against
    </li>
    <li>
      Run the lambda function from the directory
    </li>
    <li>
      <code>find /path/to/function/ -type f -anewer ./start > dep_whitelist.txt</code> to create a txt list of files with atime later than the arbitrary 'start' file. these were the files in the dependencies that were actually used by the function when you just ran it
    </li>
    <li>
      Run a quick little python script to walk the function directory and delete all unused files (files not in the dep_whitelist.txt). My script was named 'dep_cleanup.py' and sat in the lambda function directory. Be sure to explicitly include the lambda function, requirements, and whitelist files in your whitelist. This is seen with the 'hrd_whitelist' list variable. My 'dep_cleanup.py' looked like this:

        <code style="display:block;white-space: pre-wrap;text-transform:none;">
  import os

  # get this directory
  cur_dir = os.path.dirname(os.path.realpath(__file__))
  print(cur_dir)

  # non-whitelist files that we don't want to delete
  hrd_whitelist = []
  hrd_whitelist.append(cur_dir + "/dep_cleanup.py")
  hrd_whitelist.append(cur_dir + "/dep_whitelist.txt")
  hrd_whitelist.append(cur_dir + "/lambda_function.py")
  hrd_whitelist.append(cur_dir + "/requirements.txt")
  print("hardcoded to include:")
  print(hrd_whitelist)

  # open dep_whitelist file and merge with hardcoded list
  dep_whitelist = open("dep_whitelist.txt", "r")
  dep_lines = dep_whitelist.read().splitlines()
  whitelist = hrd_whitelist + dep_lines

  # count files deleted
  counter = 0

  # walk all files and folders and check if it is in the dep_whitelist
  for (dirpath, dirnames, filenames) in os.walk(cur_dir):
      for filename in filenames:
          single_file = os.path.join(dirpath, filename)
          # if not in dep_whitelist then delete
          if single_file not in whitelist:
              os.remove(single_file)
              counter += 1

  print(str(counter) + " files deleted")
  print("that's all folks!!")
        </code>
    </li>
  </ol>
</div>
