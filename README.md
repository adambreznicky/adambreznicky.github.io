# adambreznicky.com

basic [github pages](https://pages.github.com/) profile site utlizing [Flask](http://flask.pocoo.org/), [Frozen-Flask](http://pythonhosted.org/Frozen-Flask/)
and [Python](https://www.python.org/) to compile a static site. the site is hosted
directly from the base of the project repo.

initial structure templated from [here](http://stevenloria.com/hosting-static-flask-sites-for-free-on-github-pages/)

css styles from [groundworkcss2](https://groundworkcss.github.io/)

# setup and local dev

python [virtual environments](http://python-guide-pt-br.readthedocs.io/en/latest/dev/virtualenvs/) are always a good idea :)

1. cd into the repo folder and run `pip install -r requirements.txt`
1. run `python run.py` will run the app locally via port 5000

# deployment

1. run `python freeze.py`to compile and build the static site. it will be dumped
into the root of the repo
1. github pages auto deploy when new code is pushed up to the master branch of the repo.
⋅⋅* add files from latest build `git add -A`
..* then commit changes `git commit -am "<comment>"`
..* push up `git push`
