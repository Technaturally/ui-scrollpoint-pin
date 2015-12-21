# ui-scrollpoint-pin

Pins `ui-scrollpoint` elements to the target edge.

## Requirements

- AngularJS
- angular-ui-scrollpoint

## Usage


You can get it from [Bower](http://bower.io/)

```sh
bower install angular-ui-scrollpoint-pin
```

Load the script files in your application:

```html
<script type="text/javascript" src="bower_components/angular/angular.js"></script>
<script type="text/javascript" src="bower_components/angular-ui-scrollpoint/dist/scrollpoint.js"></script>
<script type="text/javascript" src="bower_components/angular-ui-scrollpoint-pin/dist/scrollpoint-pin.js"></script>
```

Add the specific module to your dependencies:

```javascript
angular.module('myApp', ['ui.scrollpoint.pin', ...])
```

Add directive to your `ui-scrollpoint` element:

```html
<div ui-scrollpoint ui-scrollpoint-pin></div>
```

## Development

We use Karma and jshint to ensure the quality of the code.  The easiest way to run these checks is to use grunt:

```sh
npm install -g gulp-cli
npm install && bower install
gulp
```

The karma task will try to open Firefox and Chrome as browser in which to run the tests.  Make sure this is available or change the configuration in `karma.conf.js`


### Gulp watch

`gulp watch` will automatically test your code and build a release whenever source files change.

### How to release

Use gulp to bump version, build and create a tag. Then push to GitHub:

````sh
gulp release [--patch|--minor|--major]
git push --tags origin master # push everything to GitHub
````

Travis will take care of testing and publishing to npm's registry (bower will pick up the change automatically). Finally [create a release on GitHub](https://github.com/TechNaturally/ui-scrollpoint-pin/releases/new) from the tag created by Travis.
