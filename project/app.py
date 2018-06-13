
# -*- coding: utf-8 -*-

from flask import Flask
from flask_flatpages import FlatPages
from flask_frozen import Freezer

app = Flask(__name__)
app.config.from_pyfile('settings.py')
pages = FlatPages(app)
freezer = Freezer(app)

@freezer.register_generator
def page():
    for page in pages:
        print(page.path)
        yield {'path': page.path}
