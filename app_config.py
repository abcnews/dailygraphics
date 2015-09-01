#!/usr/bin/env python

"""
Project-wide application configuration.
"""

import os

from authomatic.providers import oauth2
from authomatic import Authomatic

"""
NAMES
"""
# Project name in urls
# Use dashes, not underscores!
PROJECT_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_SLUG = 'dailygraphics'
CONTENT_FTP = 'http://www.abc.net.au/dat/news/interactives'

# Slug for assets dir on S3
ASSETS_SLUG = PROJECT_SLUG

# The name of the repository containing the source
REPOSITORY_NAME = 'dailygraphics'
REPOSITORY_URL = 'git@github.com:nprapps/%s.git' % REPOSITORY_NAME
REPOSITORY_ALT_URL = None # 'git@bitbucket.org:nprapps/%s.git' % REPOSITORY_NAME'

# Path to the folder containing the graphics
GRAPHICS_PATH = os.path.abspath('../graphics')

# Path to the graphic templates
TEMPLATES_PATH = os.path.abspath('graphic_templates')

"""
OAUTH
"""

GOOGLE_OAUTH_CREDENTIALS_PATH = os.path.abspath('.google_oauth_credentials')

authomatic_config = {
    'google': {
        'id': 1,
        'class_': oauth2.Google,
        'consumer_key': os.environ.get('GOOGLE_OAUTH_CLIENT_ID'),
        'consumer_secret': os.environ.get('GOOGLE_OAUTH_CONSUMER_SECRET'),
        'scope': ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.email'],
        'offline': True,
    },
}

authomatic = Authomatic(authomatic_config, os.environ.get('AUTHOMATIC_SALT'))

"""
DEPLOYMENT
"""
DEFAULT_MAX_AGE = 20
ASSETS_MAX_AGE = 300

"""
ANALYTICS
"""

GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': ''
}

# These variables will be set at runtime. See configure_targets() below
FTP_URL = 'contentftp.abc.net.au'
FTP_USER = os.environ.get('FTP_USER')
FTP_PASS = os.environ.get('FTP_PASS')
FTP_PATH = '/www/dat/news/interactives/graphics/'
DEBUG = True

"""
Run automated configuration
"""
DEPLOYMENT_TARGET = os.environ.get('DEPLOYMENT_TARGET', None)
