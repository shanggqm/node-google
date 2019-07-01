const request = require('request');
const cheerio = require('cheerio');
const querystring = require('querystring');
const util = require('util');

const linkSel = 'a';
// var descSel = 'div.s'
// var itemSel = 'div.g'
const nextSel = 'a[aria-label="Next page"]';

let URL = '%s://www.google.%s/search?hl=%s&q=%s&start=%s&sa=N&num=%s&ie=UTF-8&oe=UTF-8&gws_rd=ssl';

const nextTextErrorMsg = 'Translate `google.nextText` option to selected language to detect next results link.';
const protocolErrorMsg = "Protocol `google.protocol` needs to be set to either 'http' or 'https', please use a valid protocol. Setting the protocol to 'https'.";

// start parameter is optional
function google(query, start, callback) {
  let startIndex = 0;
  if (typeof callback === 'undefined') {
    callback = start;
  } else {
    startIndex = start;
  }
  igoogle(query, startIndex, callback);
}

google.resultsPerPage = 10;
google.tld = 'com';
google.lang = 'en';
google.requestOptions = {};
google.nextText = 'Next';
google.protocol = 'https';

function igoogle(query, start, callback) {
  // Google won't allow greater than 100 anyway
  if (google.resultsPerPage > 100) { google.resultsPerPage = 100; }
  if (google.lang !== 'en' && google.nextText === 'Next') { console.warn(nextTextErrorMsg); }
  if (google.protocol !== 'http' && google.protocol !== 'https') {
    google.protocol = 'https';
    console.warn(protocolErrorMsg);
  }

  // timeframe is optional. splice in if set
  if (google.timeSpan) {
    URL = URL.indexOf('tbs=qdr:') >= 0 ? URL.replace(/tbs=qdr:[snhdwmy]\d*/, 'tbs=qdr:' + google.timeSpan) : URL.concat('&tbs=qdr:', google.timeSpan);
  }
  const newUrl = util.format(
    URL,
    google.protocol,
    google.tld,
    google.lang,
    querystring.escape(query),
    start,
    google.resultsPerPage,
  );
  const requestOptions = {
    url: newUrl,
    method: 'GET',
  };

  // eslint-disable-next-line guard-for-in
  Object.keys(google.requestOptions).forEach(k=>{
    requestOptions[k] = google.requestOptions[k];
  });


  request(requestOptions,  (err, resp, body) =>{
    if ((err === null) && resp.statusCode === 200) {
      const $ = cheerio.load(body);
      const res = {
        url: newUrl,
        query: query,
        start: start,
        links: [],
        $: $,
        body: body,
      };

      $(linkSel).each((i, elem) =>{
        const qsObj = querystring.parse($(elem).attr('href'));
        const link = qsObj['/url?q'];
        if (!link) {
          return;
        }

        const titleElem = $(elem).find('div').first();
        const descElem = $(elem).parent().parent().find('div')
          .last()
          .find('span')
          .parent();
        if (!titleElem.length || !descElem.length) {
          return;
        }
        const item = {
          title: titleElem.text(),
          link,
          description: descElem.text(),
          href: link,
        };

        res.links.push(item);
      });

      if ($(nextSel).text() === google.nextText) {
        res.next =  () =>{
          igoogle(query, start + google.resultsPerPage, callback);
        };
      }

      return callback(null, res);
    } else {
      return callback(new Error('Error on response' + (resp ? ' (' + resp.statusCode + ')' : '') + ':' + err + ' : ' + body), null, null);
    }
  });
}

module.exports = google;
