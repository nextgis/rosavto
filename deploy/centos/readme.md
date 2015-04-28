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

