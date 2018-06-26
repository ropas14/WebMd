var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://symptomchecker.webmd.com/symptoms-a-z";
let pagesVisited = {};
let promises = [];
let pagesToVisit = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname + "/";
var num=0;
let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/"
// connecting to mongo

pagesToVisit.push(start_url);
crawl();

function crawl() {
   if (pagesToVisit.length <= 0 ) {
      console.log("all pages have been visited");
      Promise.all(promises).then(function(values) {
            displayInformation();
         })
         .catch(error => {
            console.log(error, +'Promise error');
         });
      return;
   }
   let nextPage = pagesToVisit.pop();
   if (nextPage in pagesVisited) {
      // We've already visited this page, so repeat the crawl
      crawl();
   }
   else {
      // New page we haven't visited	
      visitPage(nextPage, crawl);
   }
}
 function visitPage(url, callback) {
   // Add page to our set
   pagesVisited[url] = true;
   // Make the request
   console.log("Visiting page " + url);
   let pageReq = pageRequest(url, callback);
   promises.push(pageReq);
    pageReq.then(function(body) {
         let $ = cheerio.load(body);
         collectLinks($,url);
         callback();
      }, function(err) {
         console.log(err);
         callback();
      })
      .catch(error => {
         console.log(error, +'Promise error');
      });
}

function pageRequest(url, callback) {
  var agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
  var options = {
      url: url,
      headers: {
           'User-Agent': agent
        }
      };

   return new Promise(function(resolve, reject) {
      // Asynchronous request and callback
      request.get(options, function(err, response, body) {
         if (err) {
            reject(err);
            callback();
         }
         else {
            resolve(body);
         }
      }).on('error', function(e) {
         console.log(e);
      }).end();
   });
}

function collectLinks($,url) {
   let symptoms_links= $('div#tab_content #content2 #list_az ol li a');
   let relatedsymptoms= $('div.related_symptoms table.results_table td a');

   if (symptoms_links) {
      symptoms_links.each(function() {
         let link = $(this).attr('href');
         if (link == null) {
            return;
           }       
            var lnk = baseUrl +link
            if (lnk in pagesToVisit) {}
            else {
               pagesToVisit.push(lnk);
             }         
       });
   }

  if(relatedsymptoms!=""){
   var pages = $('div.pagination:nth-of-type(2) ul li a');
    if (pages){
       pages.each(function() {
         let link = $(this).attr('href');
         if (link == null) {
            return;
           }       
            var lnk = baseUrl +link
            if (lnk in pagesToVisit) {}
            else {
               pagesToVisit.push(lnk);
             }         
       });
    }
 relatedsymptoms.each(function() {
         let link = $(this).attr('href');
         if (link == null) {
            return;
           }       
       var lnk = baseUrl +link

        var item = {
         url:lnk,
         status:'new'        
           };


MongoClient.connect(mongourl, function(err, db) {
  if (err) {throw err;
    return;}
  var dbo = db.db("webmd");
  var query = {url:lnk}
  dbo.collection("conditionLinks").find(query).toArray(function(error, rslt){
    if (error) throw error;
    if(rslt.length < 1){
       dbo.collection("conditionLinks").insertOne(item, function(err, result) {
       if (err) throw err;
       num++
       console.log(num + "document in db" );
        });
    }
   else{}

   });
  
 });
    });
  }
}


function displayInformation() {
   console.log("Total number of items = " + num);

}