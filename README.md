#Portfolio Committed vs Delivered
Provided a "date 1" and a "date 2", this app shows a visual of the "Features" associated with the selected release for the selected (or all) "Initiatives" on the selected Date1 and Date2.  

![ScreenShot](/images/portfolio-committed-vs-delivered.png)

This app requires a Release scoped dashboard to run.  

Note:  For the purpose of the README we will refer to first level portfolio items as "Features" and second level portfolio items as "Initiatives".  
This app is based on portfolio item type level and will work regardless of whether or not the portfolio item type names are different than what is used in this readme.  

###Committed
"Features" items associated with the selected Release and "Initiatives" on Date 1 are represented in the chart as "Committed" (Yellow)

The remaining bars (Delivered, Added, Added (Blocked), Not Complete, Not Complete (Blocked) represent the First level portfolio items associated with the selected Release and second level portfolio items on "date 2".  
###Delivered
These are "Features" that were in the Portfolio Item "Complete" state (as configured in the app settings) on Date 2.  
"Features" that were committed on "Date1" and in a state of "Complete" are included in this count as well as items that are in a state of "Done" but were added to the Release or "Initiative" after "Date1"

###Not Complete
This count includes "Features" that were associated with the selected Release and "Initiative" on "Date 1" but were not in a "Complete" state on "Date 2".  

###Not Complete (Blocked)
This count includes "Features" that belong to the above "Not Complete" category but were in a state of "Blocked" (as configured in App settings) on "Date 2".

###Added 
This count includes "Features" that were NOT associated with the selected Release and "Initiative" on "Date 1" and were also not in a "Complete" state on "Date 2".  

###Added (Blocked)
This count includes "Features" that belong to the above "Added" category but are also in a state of "Blocked" (as configured in App Settings) on "Date 2".

![ScreenShot](/images/select-portfolio-items.png) To see the chart for only selected "Initiatives", select one or more "Initiatives" using the "Select Portfolio Items" button.
To see all data for all "Initiatives" that have "Features" in the selected release, click the "Clear All" button.  
By default, this chart shows all "Initiatives" that have "Features" in the selected Release.  


## App Settings
![ScreenShot](/images/portfolio-committed-vs-delivered-settings/png)

###Portfolio Complete State
The portfolio item state that should be considered "Complete" and will determine if a portoflio item is included in the "Delivered" count above.  

###Portfolio Blocked Field
The boolean field that determines if a Portfolio Item is blocked.  


## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to create a
  debug version of the app, to run the slow test specs and/or to use grunt to
  install the app in your test environment.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret",
        "server": "https://rally1.rallydev.com"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.

##### grunt deploy

Use grunt deploy to build the deploy file and then install it into a new page/app in Rally.  It will create the page on the Home tab and then add a custom html app to the page.  The page will be named using the "name" key in the config.json file (with an asterisk prepended).

To use this task, you must create an auth.json file that contains the following keys:
{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com"
}

(Use your username and password, of course.)  NOTE: not sure why yet, but this task does not work against the demo environments.  Also, .gitignore is configured so that this file does not get committed.  Do not commit this file with a password in it!

When the first install is complete, the script will add the ObjectIDs of the page and panel to the auth.json file, so that it looks like this:

{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com",
    "pageOid": "52339218186",
    "panelOid": 52339218188
}

On subsequent installs, the script will write to this same page/app. Remove the
pageOid and panelOid lines to install in a new place.  CAUTION:  Currently, error checking is not enabled, so it will fail silently.

##### grunt watch

Run this to watch files (js and css).  When a file is saved, the task will automatically build and deploy as shown in the deploy section above.

