#!/usr/bin/env python
# _*_ coding:utf-8 _*_
import os
import shutil

from fabric.api import task
from fabric.state import env
from glob import glob

import app
import app_config
import utils


@task(default=True)
def render(path=''):
    """
    Render HTML templates and compile assets.
    """
    custom_location = False
    if path:
        slug, abspath = utils.parse_path(path)
        if abspath != app_config.GRAPHICS_PATH:
            custom_location = True
        _render_graphics(['%s/%s' % (abspath, slug)], custom_location)
    else:
        _render_graphics(glob('%s/*' % app_config.GRAPHICS_PATH))


def _render_graphics(paths, custom_location=False):
    """
    Render a set of graphics
    """
    from flask import g

    # Fake out deployment target
    # app_config.configure_targets(env.get('settings', None))

    for path in paths:

        slug = path.split('%s/' % app_config.GRAPHICS_PATH)[1].split('/')[0]

        if not os.path.exists('%s/build' % path):
            os.makedirs('%s/build' % path)

        if not os.path.exists('%s/build/css' % path):
            os.makedirs('%s/build/css' % path)

        if not os.path.exists('%s/build/js' % path):
            os.makedirs('%s/build/js' % path)

        with app.app.test_request_context(path='graphics/%s/' % slug):
            g.compile_includes = True
            g.compiled_includes = {}
            if custom_location:
                # warning message
                g.custom_location = True
                g.alt_path = path
                # Test if there's a local pym copy
                if os.path.exists('%s/js/lib/pym.js' % path):
                    g.local_pym = True

            view = app.graphic.__dict__['_graphics_detail']
            content = view(slug).data

        with open('%s/build/index.html' % path, 'w') as writefile:
            writefile.write(content)

        # Fallback for legacy projects w/o child templates
        if not os.path.exists('%s/child_template.html' % path):
            continue

        with app.app.test_request_context(path='graphics/%s/child.html' % (
                slug)):
            g.compile_includes = True
            g.compiled_includes = {}
            if custom_location:
                g.alt_path = path
            view = app.graphic.__dict__['_graphics_child']
            content = view(slug).data

        with open('%s/build/child.html' % path, 'w') as writefile:
            writefile.write(content)

        os.system('cp %s/css/graphic-header.css %s/build/css' % (path, path))
        os.system('cp %s/js/graphic-header.js %s/build/js' % (path, path))
        os.system('cp %s/js/graphic-footer.js %s/build/js' % (path, path))

    # Un-fake-out deployment target
    # app_config.configure_targets(app_config.DEPLOYMENT_TARGET)
