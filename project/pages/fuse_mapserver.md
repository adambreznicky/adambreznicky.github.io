title: FUSE s3 Mapserver
date: 2018-07-27

<h6>
  <a href="http://mapserver.org/">Mapserver</a> is a pretty convenient way to host WMS services in a lightweight, easy-to-implement manner. One can just point the Mapserver instance at a directory and it will host all the 'mapfiles' (.map extension) residing in there. Super easy, but could it be easier? When the Mapserver instance is running on a separate server, like in AWS, then one would have to SSH onto the machine to create new mapfiles or at least SCP the new ones onto it. Why not setup the instance on an EC2 with an s3 bucket mounted as the mapfile directory? Then mapfiles can be managed within the s3 bucket! Much easier to access - especially for less technical staff.
</h6>
<div class="blog_content">
  <h3>Backstory</h3>
  <p>
    This post is the result of handling the Mapserver side of my COG processing pipeline project: <a href="../cog_machine">Just Another COG in the Machine</a>.
  </p>
  <p>
    In this post I'm going to lay out the step-by-step process and commands I used to create a dockerized, Mapserver instance which hosts WMS Services from mapfiles residing and managed in an s3 bucket. I established this setup by working with a one-off, micro ec2 instance for testing (and could be followed to setup a stand alone ec2 if you like managing the dockers yourself) but these steps are aimed at running the Mapserver in AWS ECS (elastic container service).
  </p>
  <p>
    The reason I'm setting this up in ECS is very simple: ECS is awesome. ECS will manage your dockers for you which ensures they stay running and are performing. The problem to always consider is that with this service, docker instances and their machine instances may come and go. That means any machine provisioning must be built into the AMI so that if an EC2 in the ECS Cluster is turned off or replaced, the new one is already set to go. For our Mapserver, we will be running it in a container dependent upon a volume on it's host machine that is a special mounted s3 directory.  This means that the majority of this project is creating an AMI (amazon machine image) properly provisioned with this drive and associated permissions so that we can deploy an ECS cluster utilizing it to host the container service that is the Mapserver.
  </p>
  <p>
    One crucially awesome aspect of Mapserver, which is also the key that makes this setup possible, is that with every client request to Mapserver is a new, fresh pull from the mapfile. This means that one can edit and update mapfiles and Mapserver doesn't need any new deployment, refreshing, or reconfiguring to make the changes instantly available. Add a new mapfile or edit an existing one and it is immediately available with the very next request. We couldn't deploy Mapserver as a Amazon managed docker otherwise because every time a new mapfile appeared or the docker turned off, a manual effort would be required to get it all going again... And we want less work, not more.
  </p>

  <h3>Steps to Create the Mapserver</h3>

  <h5>Prerequisites</h5>
  <p>
    <ul>
      <li>
        s3 Bucket for the mapfiles. For the instructions below, we will assume it is named "mapserver-bucket"
      </li>
      <li>
        AWS IAM User with an Access Key ID and Secret Access Key. Set the keys aside as we will need them to provision the ECS Optimized EC2 AMI. (If serving WMS Services pointed at s3 like in <a href="../cog_machine">this</a> project, you can use these keys in the mapfiles to access the COGS)
      </li>
      <li>
        Create and apply an IAM Permission Policy to the user with read and write permissions to the s3 bucket
      </li>
    </ul>
  </p>

  <h5>Create a Custom AMI</h5>
  <p>
    <ol>
      <li>
        Get the latest and greatest 'ECS optimized' AMI as the base to provision for our purposes. On the day of writing this, the code for this AMI is <code>ami-5253c32d</code>.
        <br/>
        I haven't found an easier way to get this aside from going to the AWS console, click ECS, choose to 'Create Cluster', and see it listed in the form. Searching the community AMI library for 'ECS' reveals lists of ECS images and doesn't descipher which is the latest so this is simply how I find it right quick.</li>
      <li>
        Use the latest ECS AMI code to create a free t2.micro EC2 instance. Setup security so that you can SSH onto the instance and so that it has web access for downloading packages. We will only need this machine running for a few minutes as we provision it and create a custom AMI. Then we will terminate it.
      </li>
      <li>
        SSH onto your new instance. Connection information is found by right clicking the instance and choosing 'Connect' in the EC2 Dashboard instance list.
      </li>
      <li>
        This is where the fun begins. We will be following <a href="https://cloudkul.com/blog/mounting-s3-bucket-linux-ec2-instance/">these</a> basic instructions to install FUSE s3fs and mount our bucket.
        <br/>
        <code>sudo yum update all</code> to ensure the OS is up to date
      </li>
      <li>
        <code style="white-space: pre-wrap;">sudo yum install automake fuse fuse-devel gcc-c++ git libcurl-devel libxml2-devel make openssl-devel</code> to install FUSE
      </li>
      <li>
        <code>git clone https://github.com/s3fs-fuse/s3fs-fuse.git</code> to clone the FUSE s3fs project
      </li>
      <li>
        <code>cd s3fs-fuse</code> to move into the project folder for installation
      </li>
      <li>
        <code>./autogen.sh</code> for compilation
      </li>
      <li>
        <code>./configure --prefix=/usr --with-openssl</code> for compilation
      </li>
      <li>
        <code>make</code> for compilation
      </li>
      <li>
        <code>sudo make install</code> for installation
      </li>
      <li>
        <code>which s3fs</code> should print '/usr/bin/s3fs' to prove the installation was successful
      </li>
      <li>
        <code>cd ..</code> to back out into the ec2-user home directory ('/home/ec2-user')
      </li>
      <li>
        <code>touch .passwd-s3fs</code> to create the s3fs credential configuration file
      </li>
      <li>
        <code>vi .passwd-s3fs</code> to open the file for editing
      </li>
      <li>
        With the file open for editing in vi, hit the <code>i</code> key to start 'insert' mode.
        <br/>
        Then enter the user Access Key ID and Secret Access Key from the prerequisites above, separated by a colon, on a single line.
        <br/>
        Like this:<code><-- access key id -->:<-- secret access key --></code>
        <br/>
        Then save and close the file by clicking the <code>ESC</code> key, then typing <code>:wq!</code>, and finally hitting <code>Enter</code>.
        <br/>
        I know what you're thinking right now -- "instructions include how to close vi editor?!?!?!". Yup, you're welcome. ;)
      </li>
      <li>
        <code>cat .passwd-s3fs</code> to print the file contents and ensure yourself it saved properly
      </li>
      <li>
        <code>chmod 600 ./.passwd-s3fs</code> to apply necessary permissions to the file
      </li>
      <li>
        <code>cat /etc/fuse.conf</code> to print the file contents for the FUSE configuration. we will be editing this
      </li>
      <li>
        <code>sudo vi /etc/fuse.conf</code> to open the file for editing
      </li>
      <li>
        With the file open for editing in vi, hit the <code>i</code> key to start 'insert' mode.
        <br/>
        Then arrow down and delete the comment hash and space in front of 'user_allow_other'.
        <br/>
        The file contents should look like this:
        <code style="white-space: pre-wrap;">
# mount_max = 1000
user_allow_other
        </code>
        <br/>
        Then save and close the file by clicking the <code>ESC</code> key, then typing <code>:wq!</code>, and finally hitting <code>Enter</code>.
      </li>
      <li>
        <code>cat /etc/fuse.conf</code> to print the file contents and ensure yourself it saved properly
      </li>
      <li>
        <code>mkdir bucket</code> to make a directory which we will use to mount the s3 bucket. I'm calling it 'bucket' for this instructional  but you can call it whatever you'd like
      </li>
      <li>
        <code>s3fs mapserver-bucket -o multireq_max=5 -o allow_other ./bucket</code> to mount the bucket to our directory. If you feel desire to unmount it, the command would be <code>sudo umount ./bucket</code>
      </li>
      <li>
        <code>sudo vi /etc/rc.local</code> to open the rc file. We will be adding an entry for automatically mounting the directory on boot.
      </li>
      <li>
        With the file open for editing in vi, hit the <code>i</code> key to start 'insert' mode.
        <br/>
        Then arrow down and add a line for running the s3fs mounting command with hard paths to the binary and directory to mount. The command should be run by user ec2-user. You identified the binary path earlier with the command <code>which s3fs</code>.
        <br/>
        The added line should look like this:<code style="white-space: pre-wrap;">sudo runuser -l ec2-user -c '/usr/bin/s3fs mapserver-bucket -o multireq_max=5 -o allow_other /home/ec2-user/bucket'</code>
        <br/>
        Then save and close the file by clicking the <code>ESC</code> key, then typing <code>:wq!</code>, and finally hitting <code>Enter</code>.
      </li>
      <li>
        <code>exit</code> to end the SSH session.
      </li>
      <li>
        Now let's save the image. Open up the AWS Console, navigate to the EC2 Dashboard, right click our temporary micro EC2, choose 'Image' -> 'Create Image'. Fill in an 'Image name' and 'Image description'. Click the blue button and chill out while the image is saved. View if it's complete by choosing 'AMIs' under 'IMAGES' on the sidebar.
      </li>
    </ol>
  </p>

  <h5>Deploy to ECS</h5>
  <p>
    <ol>
      <li>
      </li>
    </ol>
  </p>

</div>
