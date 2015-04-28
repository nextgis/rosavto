1. Create cloud user  
'useradd cloud -m  
passwd cloud'

2. Add cloud user to sudo  
`sudo visudo`

Add the line:  
`cloud ALL=(ALL:ALL) ALL`

3. Install nginx. 
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

4. Install PostreSQL 9.4 for CentOS 6.x 64-bit, instructions here - http://trac.osgeo.org/postgis/wiki/UsersWikiPostGIS21CentOS6pgdg

5. Restore database
sudo -s -u postgres
psql -f NAME.backup postgres

6. Install python 2.7
Instruction is available here - http://bicofino.io/blog/2014/01/16/installing-python-2-dot-7-6-on-centos-6-dot-5/

After need to create symbolic links to new python tools:
sudo cp /usr/local/bin/python2.7 /usr/bin/python2.7
sudo cp /usr/local/bin/pip /usr/bin/pip2.7
sudo cp /usr/local/bin/virtualenv /usr/bin/virtualenv2.7


