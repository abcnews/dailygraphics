#!/usr/bin/env python

import copy
from cStringIO import StringIO
from fnmatch import fnmatch
import gzip
import hashlib
import mimetypes
import os

from ftplib import FTP

import app_config

GZIP_FILE_TYPES = ['.html', '.js', '.json', '.css', '.xml']

class FakeTime:
    def time(self):
        return 1261130520.0

def checkExists (ftp, path):
    return path in ftp.nlst()

def uploadThis(ftp, path):
    files = os.listdir(path)
    os.chdir(path)
    for f in files:
        p = os.path.join(path, f)
        if os.path.isfile(p):
            fh = open(f, 'rb')
            # print "IS FILE %s" % p
            ftp.storbinary('STOR %s' % f, fh)
            fh.close()
        elif os.path.isdir(p):
            # print "IS DIR %s" % p
            if not checkExists(ftp, f):
                ftp.mkd(f)
            ftp.cwd(f)
            uploadThis(ftp, p)
    ftp.cwd('..')
    os.chdir('..')

# Hack to override gzip's time implementation
# See: http://stackoverflow.com/questions/264224/setting-the-gzip-timestamp-from-python
gzip.time = FakeTime()

def deploy_file(connection, src, dst, headers={}):
    """
    Deploy a single file to S3, if the local version is different.
    """


def deploy_folder(src, dst, headers={}, ignore=[]):
    """
    Deploy a folder to ContentFTP
    """
    print '\nDeploying...'
    ftp = FTP(app_config.FTP_URL)
    ftp.login(app_config.FTP_USER, app_config.FTP_PASS)
    ftp.cwd(app_config.FTP_PATH)
    if not checkExists(ftp, dst):
        ftp.mkd(dst)
    ftp.cwd(dst)
    uploadThis(ftp, os.path.join(src, 'build'))

    # for src, dst in to_deploy:
        # deploy_file(ftp, src, dst, headers)

def delete_folder(dst):
    """
    Delete a folder from S3.
    """
    s3 = boto.connect_s3()

    bucket = s3.get_bucket(app_config.S3_BUCKET['bucket_name'])

    for key in bucket.list(prefix='%s/' % dst):
        print 'Deleting %s' % (key.key)

        key.delete()
