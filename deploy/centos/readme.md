### Create cloud user  
```sudo useradd cloud -m    
sudo passwd cloud```

### Add cloud user to sudo  
`sudo visudo`

Add the line:  
`cloud ALL=(ALL:ALL) ALL`

### Install nginx. 
Create file:
`sudo vim /etc/yum.repos.d/nginx.repo`

Add the lines:  
`[nginx]  
name=nginx repo  
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/  
gpgcheck=0  
enabled=1`

Update yum  
`sudo yum update`

Install nginx  
`sudo yum install nginx`

### Install PostreSQL 9.4
for CentOS 6.x 64-bit, instructions here - http://trac.osgeo.org/postgis/wiki/UsersWikiPostGIS21CentOS6pgdg

### Restore database
`sudo -s -u postgres  
psql -f NAME.backup postgres`

### Install python 2.7
Instruction is available here - http://bicofino.io/blog/2014/01/16/installing-python-2-dot-7-6-on-centos-6-dot-5/

After need to create symbolic links to new python tools:
`sudo cp /usr/local/bin/python2.7 /usr/bin/python2.7  
sudo cp /usr/local/bin/pip /usr/bin/pip2.7  
sudo cp /usr/local/bin/virtualenv /usr/bin/virtualenv2.7`

### Create virtualenv for deploy
`cd /home/cloud/projects/  
virtualenv2.7 env`

### Install svn client
`sudo yum install mod_dav_svn subversion  
cd /home/cloud/projects/  
svn co URL_GIS_REPO`

URL_GIS_REPO - `https://xxxxxxx.xx/svn/project/Builds/gis` for example 

### Create widgets and ngw directories
`mkdir /home/cloud/projects/widgets  
ln -s /home/cloud/projects/gis/V1.5.1.7/widgets /home/cloud/projects/widgets/rosavto  
mkdir /home/cloud/projects/ngw  
mkdir /home/cloud/projects/ngw/nextgisweb_rosavto`

### Install psycopg2
`sudo yum install python-devel postgresql-devel`

