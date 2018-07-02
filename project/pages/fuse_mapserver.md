title: FUSE s3 Mapserver
date: 2018-07-27 10:38:00

<h6>
  <a href="http://mapserver.org/">Mapserver</a> is a pretty convenient way to host WMS services in a lightweight, easy-to-implement manner. One can just point the Mapserver instance at a directory and it will host all the 'mapfiles' (.map extension) residing in there. Super easy, but could it be easier? When the Mapserver instance is running on a separate server, like in AWS, then one would have to SSH onto the machine to create new mapfiles or at least SCP the new ones onto it. Why not setup the instance on an EC2 with an s3 bucket mounted as the mapfile directory? Then mapfiles can just be managed within the s3 bucket! Much easier to access and manage; especially for less technical staff.
</h6>
<div class="blog_content">
  <h3>Backstory</h3>
  <p>
    This post is the result of handling the Mapserver side of my COG processing pipeline project: <a href="./cog_machine">Just Another COG in the Machine</a>.
  </p>
  <p>
    In this post I'm going to lay out the step-by-step process and commands I used to create a dockerized, Mapserver instance which hosts WMS Services from mapfiles residing and managed in an s3 bucket.
  </p>

</div>
<!-- pulls with every request -->
