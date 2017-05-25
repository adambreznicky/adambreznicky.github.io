![Groundwork Logo](https://0.gravatar.com/avatar/c8ae740c0b5f7dd913308974a07ee02c?s=150)

GroundworkCSS 2.5.0
====

Say hello to responsive design made easy.

[http://groundworkcss.github.io](http://groundworkcss.github.io)

[GroundworkCSS](http://groundworkcss.github.io) is a fully responsive HTML5, CSS 
and Javascript toolkit created by [@ghepting](http://twitter.com/ghepting).

Using GroundworkCSS, you can rapidly prototype and create accessible web apps that 
work on virtually any device. Key features that make GroundworkCSS stand out are:

* nestable, fractional, responsive, adaptive, fluid grid system
* works on virtually anything: mobile, tablet, or large screen devices
* built with modular Sass and CoffeeScript components
* easy to customize
* highly configurable
* supports purely semantic implementations by utilizing Sass @extend, @mixin and 
  %placeholder classes
* built-in ARIA role support
* responsive text and tables
* and much more

Getting Started using GroundworkCSS
====

Default Build
----

The easiest way to incorporate GroundworkCSS into your project is to copy the
pre-compiled CSS and JS files into your project, and then refer to them in
markup. The 2 most important files are:

* css/groundwork.css
* js/groundwork.all.js

In addition to these (required) support files:

* js/libs/modernizr-2.6.2.min.js (required)
* js/libs/jquery-1.10.2.min.js (required)
* css/groundwork-ie.css (required for old IE compatibility)

All in all, you may end up with markup that looks like the following:

**At the top of your HTML document (within the head section)**

    <!-- Modernizr -->
    <script src="/js/libs/modernizr-2.6.2.min.js"></script>
    <!-- framework css -->
    <!--[if gt IE 9]><!-->
    <link type="text/css" rel="stylesheet" href="/css/groundwork.css">
    <!--<![endif]-->
    <!--[if lte IE 9]>
    <link type="text/css" rel="stylesheet" href="/css/groundwork-core.css">
    <link type="text/css" rel="stylesheet" href="/css/groundwork-type.css">
    <link type="text/css" rel="stylesheet" href="/css/groundwork-ui.css">
    <link type="text/css" rel="stylesheet" href="/css/groundwork-anim.css">
    <link type="text/css" rel="stylesheet" href="/css/groundwork-ie.css">
    <![endif]-->

**At the bottom of your HTML document (just before your closing body tag)**

    <script type="text/javascript" src="/js/libs/jquery-1.10.2.min.js"></script>
    <script type="text/javascript" src="/js/groundwork.all.js"></script>


Custom Build
----

If you use Sass and you want to compile your own build of Groundwork or 
integrate it along with your project code.

Sass source files are located in **src/sass** and **src/coffee**.

Important files to edit are:

* groundwork.sass: dictates which modules are imported for compilation
(delete/comment out unneeded modules).
* _settings.sass: initial settings for Groundwork, including customizable 
colors, options to turn off rapid prototyping classes and much more.

You can then output your own groundwork[.css/.js], or import groundwork.sass 
as part of your project's Sass. The latter lets you utilise GroundworkCSS's 
library through ```@include``` or ```@extend``` for your custom classes.


Ruby on Rails
----

If you're using Groundwork in a Ruby on Rails project, definitely use the 
[groundworkcss-rails gem](http://github.com/groundworkcss/groundworkcss-rails)


Want to develop on and contribute to GroundworkCSS?
----
Read [Contributing to Groundwork](https://github.com/groundworkcss/groundwork/wiki/Contributing-to-Groundwork) and fork away!  :)
