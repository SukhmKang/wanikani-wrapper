Title: WaniKani API Reference

URL Source: https://docs.api.wanikani.com/20170710/

Markdown Content:
WaniKani API v2
Revision 20170710
Introduction
Getting Started
Best Practices
Additional Information
Resources
Assignments
Level Progressions
Resets
Reviews
Review Statistics
Spaced Repetition Systems
Study Materials
Subjects
Summary
User
Voice actors
WaniKani API Mailing List
Visit WaniKani
Contact Us
Documentation Powered by Slate
Introduction

Welcome to "WaniKani: The API!" You can use our API to access progress data for a user's account and a ton of general reference data for the subjects within WaniKani.

This version is built around a RESTful structure, with consistent, resource-oriented URLs. We support that structure with standard HTTP features: HTTP verbs for all our endpoints to indicate different actions, HTTP authentication headers, and HTTP response codes to indicate both success and various errors. We've turned on cross-origin resource sharing to allow for secure client-side access. We respond to all requests with JSON, making it easy to parse those responses into native objects in a variety of languages. These should open up the API to any client that supports these features and data structures.

We've got information on general usage, like authentication and error codes, in Getting Started. We make a few suggestions on how to optimize your usage of the API in Best Practices and clarify a few obscure topics under Additional Information. Finally, details for all of the available resources and endpoints are under Resources.

Feel free to reach out via email or through the community if you have any questions, comments, or requests about the API.

Getting Started
Authentication

To authorize, use this code:

curl "https://api.wanikani.com/v2/<api_endpoint_here>" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = '<api_endpoint_here>';
var requestHeaders =
  new Headers({
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Make sure to replace <api_token_here> with the API key.

WaniKani uses your secret API token to authenticate requests to the API. You can obtain and manage your v2 token in Settings / API Tokens on WaniKani. The token has to be included with every request, and should be delivered in a HTTP header that looks like:

Authorization: Bearer <api_token_here>

Also note that all requests must be made over HTTPS. Any requests made over HTTP or without authentication headers will fail.

 You must replace <api_token_here> with the your API key.
Response Structure

We return JSON from all the API endpoints, even when an error occurs.

There are two main structures we return: resources and collections. Singular resource endpoints deliver information about a single entity, such as an assignment or subject. Collections contain summary data about a bunch of resources, and also include each of the resources.

There's a third type of structure that's less common: a report. Reports summarize disparate or novel information into a single place, and don't follow the same structure as collections.

Resources follow the pattern:

{
  "id": <integer>,
  "object": <string>,
  "url": <string>,
  "data_updated_at": <date>,
  "data": <object>
}


And collections look like:

{
  "object": <string>,
  "url": <string>,
  "pages": {
    "next_url": <string_or_null>,
    "previous_url": <string_or_null>,
    "per_page": <integer>
  },
  "total_count": <integer>,
  "data_updated_at": <date_or_null>,
  "data": <array_of_objects>
}


All of the responses have a few shared, high-level attributes: object, url, data_updated_at, and data.

Attribute	Description
object	The kind of object returned. See the object types section below for all the kinds.
url	The URL of the request. For collections, that will contain all the filters and options you've passed to the API. Resources have a single URL and don't need to be filtered, so the URL will be the same in both resource and collection responses.
data_updated_at	For collections, this is the timestamp of the most recently updated resource in the specified scope and is not limited by pagination. If no resources were returned for the specified scope, then this will be null. For a resource, then this is the last time that particular resource was updated.
data	For collections, this is going to be the resources returned by the specified scope. For resources, these are the attributes that are specific to that particular instance and kind of resource.
Object Types

Every successful API response contains an object attribute that tells you which kind of thing you're getting. As mentioned before, there are two object types that return information on many different resources:

collection
report

The following are singular resources:

assignment
kana_vocabulary
kanji
level_progression
radical
reset
review_statistic
review
spaced_repetition_system
study_material
user
vocabulary
voice_actor
Data Types

We stick to the common JSON data types in our responses: strings, integers, booleans, arrays, and objects. We follow the Javascript standard for date formatting, returning them in ISO 8601 format, rounded to the microsecond.

Pagination
Collection Size

By default, the maximum number of resources returned for collection endpoints is 500. Some endpoints may return a different size — reviews and subjects have a maximum size of 1,000.

Any collection response has the per-page count in the pages.per_page attribute. Those same responses have a total_count attribute, too. That is a count of all resources available within the specified scope, not limited to pagination.

Pagination in Action

When there are more resources to return than the per-page limit, we use a cursor-based pagination scheme to move through the pages of results. We use the id of a resource as the cursor.

Collections have the following nested within a pages attribute:

Attribute	Data Type	Description
next_url	null or String	The URL of the next page of results. If there are no more results, the value is null.
previous_url	null or String	The URL of the previous page of results. If there are no results at all or no previous page to go to, the value is null.
per_page	Integer	Maximum number of resources delivered for this collection.
 Pro tip: the first page has no previous page, and the last page has no next page.

The previous page of results can be requested by passing in the page_before_id parameter, with the value being the id you want to look before. Similar logic applies for the next page. Pass in the page_after_id parameter with with the id you want to look after.

If a cursor is outside the range of ids for the collection, an empty result set is returned for data.

Example

Let’s say there are four resources with IDs of 1, 2, 3, 4.

If we make a request with ...?page_after_id=2, then we'll get resources with IDs 3 and 4.
If we make a request with ...?page_before_id=3, then we'll get resources with IDs 1 and 2.
If we make a request with ...?page_after_id=5, then we'll get a collection with an empty data field.
Filters

Collections have optional filters to help narrow the results returned. The filters are passed in as URL parameters, like ?parameter=value&other_parameter=value.

Any time we take a query parameter that's listed as an array data type, we take that array as a comma delimited list of values. A single value is also valid.

So, if a collection endpoint takes subject_ids as an argument for filtering results, your requests might have the following formats:

A single-member subject_ids request: ...?subject_ids=8
A multiple-member subject_ids request: ...?subject_ids=8,16,64
Errors

Errors with a message will return with the follow response body structure:

{ "error": <string>, "code": <integer> }


We use standard HTTP response codes to indicate the status of the response. Codes in the 200s indicate success, 400s usually indicate a client configuration problem (that's you), while 500s indicate that something bad is happening on the server (that's us).

The codes are presented in the header of the response; some error responses will also contain a body with the message specified below:

Code	Meaning	Message
200	Success	n/a
401	Unauthorized	“Unauthorized. Nice try.”
403	Forbidden	
404	Not Found	
409	Conflict	
422	Unprocessable Entity	Description of how the request was malformed.
429	Too Many Requests	
500	Internal Server Error	n/a
503	Service Unavailable	n/a
Rate Limit

We enforce the following rate limits to ensure decent response times for everyone using the API:

Throttle	Value
Requests per minute	60

An HTTP status code of 429 (Forbidden) and a body with the message Rate Limit Exceeded is returned if the limits are exceeded (shocking, we know).

In the response headers, the following rate limit information is provided:

Header	Description
RateLimit-Limit	The rate limit for the current period.
RateLimit-Remaining	The remaining rate available for the current period.
RateLimit-Reset	The timestamp of when the rate limit will reset. The value is epoch time in seconds.

It is recommended to make use of the header rate limit details to programatically handle HTTP status code 429 responses in an optimal way.

Revisions (aka Versioning)

To define the revision, use this code:

curl "https://api.wanikani.com/v2/<api_endpoint_here>" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = '<api_endpoint_here>';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Any time we make ‘breaking changes’ to the API, we release a new, timestamped revision of the API. Non-breaking changes don't trigger a new revision, and those changes are available in all versions of the API.

A breaking change is anything that changes the existing structure of a response, e.g. the renaming of a field in a resource.
Non-breaking changes are things like exposing new resource attributes or adding whole new endpoints.

Revisions are designated by timestamps in the format YYYYMMDD. We expect the revision to be included in all API requests to the server in a header that looks like the following: Wanikani-Revision: 20170710.

 If you don't specify a revision, the API will default to the first revision: 20170710.
Best Practices

We're always working to make the API as performant as possible, but there are a few things you can do to optimize your use of the data we deliver and speed things up when you need to make new requests: cache data locally whenever possible, make conditional requests to minimize network load, and make use of the updated_after filter on a lot of the endpoints.

When you're building applications or services that other people will use, there's also some work to be done to respect the access to content granted by a subscription to WaniKani (per our terms and generally being a good citizen).

Caching

Most of the data on WaniKani doesn't change that often, so long-lived caches or more permanent stores that are periodically updated can eliminate a lot of time-consuming requests and help with offline functionality, if that's something you're after.

Here are a few recommendations that might influence what you cache and how long you keep it around:

Cache subjects as aggressively as possible. They aren't very frequently updated, and you'll probably need to access them frequently. They're the object that ties together assignments, review statistics, and study materials.
Reviews and resets are never changed once recorded, but reviews are created frequently. You can put these two in long-term storage if you need them.
Assignments, review statistics, and study materials have moderate levels of updates. When a user levels up or passes a a subject, there might be a small flurry of activity with new assignments being created and existing records being updated. As an assignment gets further and further along in the SRS stages, those updates will become less and less frequent.
The summary report changes every hour. Caching the results of this request might help with offline activity, but the data changes, well, every hour.
The user endpoint isn't updated a ton, but when it does, it's going to be pretty important to capture.

Do take note any of the above recommendations may become outdated, but we will try out best to communicate these changes.

Caching is always tricky business. When do you expire it? How do you refresh it? Who's in charge of it?

We've done a couple things to try and help with a couple of the problems around caching. The first is to support conditional requests, which lets us quickly tell you that a record hasn't changed since you got it last. The second is to give you tools to get only the updated or new records after any point in time, letting you easily refresh your local data caches and stores without having to parse all the records.

Conditional Requests

We accept the If-None-Match and If-Modified-Since headers for every endpoint. If the response body hasn't changed since the last request, then a HTTP status code 304 (Not Modified) and an empty response body is returned. The advantage to using these headers is a faster response time since we don't have to generate a full response; we assume you still have the unmodified data cached.

Each response includes the ETag and Last-Modified headers that are used to populate If-None-Match and If-Modified-Since, respectively. These values can be used in future requests at the matching endpoint.

If both If-None-Match and If-Modified-Since are passed in, then If-None-Match takes precedence.

If-Modified-Since

To define If-Modified-Since, use this code:

curl "<api_endpoint_here>"
  -H "Authorization: Bearer <api_token_here>"
  -H "Wanikani-Revision: 20170710"
  -H "If-Modified-Since: <last_modified_date_here>"

var requestHeaders = new Headers();
requestHeaders.append('Authorization', 'Bearer <api_token_here>');
requestHeaders.append('Wanikani-Revision', '20170710');
requestHeaders.append('If-Modified-Since', '<last_modified_date_here>');
var requestInit = { method: 'GET', headers: requestHeaders };
var endpoint = new Request('<api_endpoint_here>', requestInit);

fetch(endpoint)
  .then(function(response) { return response.json(); })
  .then(function(responseBody) { console.log(responseBody); });


Make sure to replace <last_modified_date_here> with the Last-Modified value extracted from a previous response header or any datetime.

The If-Modified-Since request header takes in a Last-Modified value from the last request — or any datetime — in the following format:

If-Modified-Since: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT

Where:

<day-name> — One of "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", or "Sun" (case-sensitive).
<day> — 2 digit day number, e.g. "04" or "23".
<month> — One of "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" (case sensitive).
<year> — 4 digit year number, e.g. "1990" or "2016".
<hour> — 2 digit hour number, e.g. "09" or "23".
<minute> — 2 digit minute number, e.g. "04" or "59".
<second> — 2 digit second number, e.g. "04" or "59".
GMT — Greenwich Mean Time. HTTP dates are always expressed in GMT, never in local time.

Example: If-Modified-Since: Fri, 11 Nov 2011 11:11:11 GMT

The generally-excellent MDN web docs have more information on the If-Modified-Since header.

If-None-Match

To define If-None-Match, use this code:

curl "<api_endpoint_here>"
  -H "Authorization: Bearer <api_token_here>"
  -H "Wanikani-Revision: 20170710"
  -H "If-None-Match: <etag_here>"

var requestHeaders = new Headers();
requestHeaders.append('Authorization', 'Bearer <api_token_here>');
requestHeaders.append('Wanikani-Revision', '20170710');
requestHeaders.append('If-None-Match', '<etag_here>');
var requestInit = { method: 'GET', headers: requestHeaders };
var endpoint = new Request('<api_endpoint_here>', requestInit);

fetch(endpoint)
  .then(function(response) { return response.json(); })
  .then(function(responseBody) { console.log(responseBody); });


Make sure to replace <etag_here> with the ETag value extracted from a previous response header.

The If-None-Match request header takes in an ETag value from the last request's response header:

If-None-Match: <etag_here>

The MDN web docs have more information on the If-None-Match header, too.

Leveraging the updated_after Filter

All of the collection endpoints support an updated_after filter. As you'd guess, that's going to only return records that have been updated after the timestamp you pass to us.

Example/Scenario/Not a Fable

How does that help with performance and caching? By only returning the records you need.

Let's say you're building a statistics site. You need to know about all the subjects plus get all of a user's assignments, review statistics, reviews, resets, and level progressions to figure out how they've done in the past and do some guesswork on how they might do in the future.

Focusing in on the assignments, let's say you decide to re-calculate a user's progress every time they log in to use your site. Without the updated_after filter, you'd have to grab all their assignments, since there'd be no way to tell which ones had changed until after you retrieved them all. For high level users, that could be 18 sequential requests! Once you've made them sit through that progress bar, you'd need to parse all the results and compare to them what you've stored locally.

With the updated_after filter, though, you can ask for only the records that have changed since the last time that user logged in, getting a smaller, faster response full of records you know you have to update or add internally. Even high activity users are only going to touch a small portion of their assignments at a time. We can generate that list of records far more rapidly, it'll be a smaller payload, and you probably won't need to page through results to get everything that you need.

Respecting Subscription Restrictions

WaniKani has paid subscriptions. That may come as a surprise in 2025, but it's true. Those subscriptions grant access to all the content past level three and let people to do lessons and reviews for that content.

When the API is used for your own uses (populating spreadsheets, backing up progress, etc.), those access restrictions don't have that much of an impact. Most of the data delivered by the API belongs to you: assignments, study materials, review statistics, and those bits about how you progress through WaniKani. The only data that isn't yours is the content in subjects. All those mnemonics, hints, and relationships have been painstakingly crafted by the WaniKani staff to make learning kanji faster and better. That content is covered by pertinent copyright laws — which also means that fair use allows you to use it to learn on your own.

Once you start building tools that can be used by other people, things change, though. First, you can't use the content to build anything that's for profit. Second, you need to respect the limitations put in place by the subscriptions. Both of those requirements are per our terms. So, how do you do meet those requirements?

The user endpoint has a subscription attribute. That should have everything you need.

max_level_granted defines the maximum level of content that's available to the user. It has two possible values: 3 and 60. The user shouldn't be able to access subjects above those levels. Lessons and reviews above those levels shouldn't be available at all and will be rejected if you try and submit them to us.
active is a boolean that tells you if the person has an active subscription.
type defines the kind of subscription, and works closely with period_ends_at. There are four values:
free subscriptions aren't really subscriptions, but can represent people who've never subscribed or have an inactive subscription. There's no period_ends_at for free subscriptions.
recurring subscriptions renew on a periodic basis. period_ends_at tells you when the subscription renews or expires. Since we give people access until the end of their subscription period even if they cancel, you can generally not check their subscription status until that time.
lifetime means the user can access WaniKani forever. period_ends_at is null, mainly because ∞ is hard for computers to get. It's possible that a lifetime user will ask for a refund or have payment difficulties, so scheduled checks on the subscription status are still needed.
unknown means the user subscription state isn't exactly known. This is a weird state on WaniKani, should be treated as free, and reported to the WaniKani developers.

Your application can use max_level_granted as a first, easy line of defense. That restricts content access based on their subscription, and is most of what you need to do. The active, type, and period_ends_at fields are all their to let you build more robust solutions. Those help you figure out when your application needs to check up on subscription status (if ever) or do things like expire access if the user hasn't connected in a while.

Additional Information
Spaced Repetition System

Our spaced repetition systems determine how subjects progress from being unavailable to users (locked) through complete memorization (burned). The knowledge guide has some good general information about how we use SRS in WaniKani.

A single spaced repetition system consists of N number of sequential stages. Each stage describes its position in the sequence as well as the time interval that’s used to determine when the subject will appear next in reviews.

Each system has the following common characteristics.

Special stage name	Stage position/number	Description
Unlocking stage	0	This is the initial stage for an assignment; it generally indicates the subject will appear in lessons.
Starting stage	1	The minimum stage for a subject to appear in reviews.
Passing stage	Value from the starting stage position up to the burning stage position	Reaching this milestone counts towards level progression and the unlocking of additional subjects.
Burning stage	N	This is the stage when the subject is complete, exits out of reviews and is no longer tested.

As mentioned before, we use the SRS stages to calculate the time until the next review (the 'space' in the 'spaced-repetition').

If the review goes well and there are no wrong answers, we move the assignment up to the next SRS stage. We make the assignment available 'interval' hours from now, at the top of the hour. For example: given an assignment at stage 1, when we submit a correct answer at 3:31pm, the assignment would move to SRS stage 2 and become available for another review at 11:00pm.
If there are wrong answers, we decrease the SRS stage based on the number of times it was wrong, and then again make it available according to the interval for that SRS stage.
User Resets

Users have the option to reset their account to a target level at or below their current level.

Resets will show up in a variety of places. Explicit records will show up under resets. They'll get a fresh level progression for the target level of the reset, and the level progression for the level they abandoned gets an abandoned_at timestamp. Finally, the assignments and review_statistics for the affected levels will get set back to their default state, waiting to be unlocked or started, depending on the levels.

Resources
Assignments

Assignments contain information about a user's progress on a particular subject, including their current state and timestamps for various progress milestones. Assignments are created when a user has passed all the components of the given subject and the assignment is at or below their current level for the first time.

Assignment Data Structure

Example Structure

{
  "id": 80463006,
  "object": "assignment",
  "url": "https://api.wanikani.com/v2/assignments/80463006",
  "data_updated_at": "2017-10-30T01:51:10.438432Z",
  "data": {
    "created_at": "2017-09-05T23:38:10.695133Z",
    "subject_id": 8761,
    "subject_type": "radical",
    "srs_stage": 8,
    "unlocked_at": "2017-09-05T23:38:10.695133Z",
    "started_at": "2017-09-05T23:41:28.980679Z",
    "passed_at": "2017-09-07T17:14:14.491889Z",
    "burned_at": null,
    "available_at": "2018-02-27T00:00:00.000000Z",
    "resurrected_at": null,
    "hidden": false
  }
}

Attribute	Data Type	Description
available_at	null or Date	Timestamp when the related subject will be available in the user's review queue.
burned_at	null or Date	Timestamp when the user reaches SRS stage 9 the first time.
created_at	Date	Timestamp when the assignment was created.
hidden	Boolean	Indicates if the associated subject has been hidden, preventing it from appearing in lessons or reviews.
passed_at	null or Date	Timestamp when the user reaches SRS stage 5 for the first time.
resurrected_at	null or Date	Timestamp when the subject is resurrected and placed back in the user's review queue.
srs_stage	Integer	The current SRS stage interval. The interval range is determined by the related subject's spaced repetition system.
started_at	null or Date	Timestamp when the user completes the lesson for the related subject.
subject_id	Integer	Unique identifier of the associated subject.
subject_type	String	The type of the associated subject, one of: kana_vocabulary, kanji, radical, or vocabulary.
unlocked_at	null or Date	

The timestamp when the related subject has its prerequisites satisfied and is made available in lessons.

Prerequisites are:

The subject components have reached SRS stage 5 once (they have been “passed”).
The user's level is equal to or greater than the level of the assignment’s subject.
Get All Assignments

Example Request

curl "https://api.wanikani.com/v2/assignments" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'assignments';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/assignments",
  "pages": {
    "per_page": 500,
    "next_url": "https://api.wanikani.com/v2/assignments?page_after_id=80469434",
    "previous_url": null
  },
  "total_count": 1600,
  "data_updated_at": "2017-11-29T19:37:03.571377Z",
  "data": [
    {
      "id": 80463006,
      "object": "assignment",
      "url": "https://api.wanikani.com/v2/assignments/80463006",
      "data_updated_at": "2017-10-30T01:51:10.438432Z",
      "data": {
        "created_at": "2017-09-05T23:38:10.695133Z",
        "subject_id": 8761,
        "subject_type": "radical",
        "srs_stage": 8,
        "unlocked_at": "2017-09-05T23:38:10.695133Z",
        "started_at": "2017-09-05T23:41:28.980679Z",
        "passed_at": "2017-09-07T17:14:14.491889Z",
        "burned_at": null,
        "available_at": "2018-02-27T00:00:00.000000Z",
        "resurrected_at": null
      }
    }
  ]
}


Returns a collection of all assignments, ordered by ascending created_at, 500 at a time.

 It is possible for a user to have started an assignment for a subject that was later moved to a level above their current level. To exclude those assignments, filter by levels from 1 to the users current level
HTTP Request

GET https://api.wanikani.com/v2/assignments

Query Parameters

The collection of assignments will be filtered on the parameters provided.

Name	Data Type	Description
available_after	Date	Only assignments available at or after this time are returned.
available_before	Date	Only assignments available at or before this time are returned.
burned	Boolean	When set to true, returns assignments that have a value in data.burned_at. Returns assignments with a null data.burned_at if false.
hidden	Boolean	Return assignments with a matching value in the hidden attribute
ids	Array of integers	Only assignments where data.id matches one of the array values are returned.
immediately_available_for_lessons	(not required)	Returns assignments which are immediately available for lessons
immediately_available_for_review	(not required)	Returns assignments which are immediately available for review
in_review	(not required)	Returns assignments which are in the review state
levels	Array of integers	Only assignments where the associated subject level matches one of the array values are returned. Valid values range from 1 to 60.
srs_stages	Array of integers	Only assignments where data.srs_stage matches one of the array values are returned. Valid values range from 0 to 9
started	Boolean	When set to true, returns assignments that have a value in data.started_at. Returns assignments with a null data.started_at if false.
subject_ids	Array of integers	Only assignments where data.subject_id matches one of the array values are returned.
subject_types	Array of strings	Only assignments where data.subject_type matches one of the array values are returned. Valid values are: kana_vocabulary, kanji, radical, or vocabulary.
unlocked	Boolean	When set to true, returns assignments that have a value in data.unlocked_at. Returns assignments with a null data.unlocked_at if false.
updated_after	Date	Only assignments updated after this time are returned.
Query Parameter Examples
Assignments Available for Review in Two Hours

If the date time now is November 11, 2017 8:42:00 AM UTC:

https://api.wanikani.com/v2/assignments?available_before=2017-11-11T10:42:00Z

Level 8 and 42 Kanji Assignments Which Have Been Burned

https://api.wanikani.com/v2/assignments?levels=8,42&subject_types=kanji&burned=true

Assignments Updated After One Hour Ago and at SRS Stage Master I

If the date time now is November 11, 2017 8:42:00 AM UTC:

https://api.wanikani.com/v2/assignments?updated_after=2017-11-11T7:42:00Z&srs_stages=7

Get a Specific Assignment

Example Request

curl "https://api.wanikani.com/v2/assignments/80463006" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'assignments/80463006';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 80463006,
  "object": "assignment",
  "url": "https://api.wanikani.com/v2/assignments/80463006",
  "data_updated_at": "2017-11-29T19:37:03.571377Z",
  "data": {
    "created_at": "2017-09-05T23:38:10.695133Z",
    "subject_id": 8761,
    "subject_type": "radical",
    "level": 1,
    "srs_stage": 8,
    "unlocked_at": "2017-09-05T23:38:10.695133Z",
    "started_at": "2017-09-05T23:41:28.980679Z",
    "passed_at": "2017-09-07T17:14:14.491889Z",
    "burned_at": null,
    "available_at": "2018-02-27T00:00:00.000000Z",
    "resurrected_at": null
  }
}


Retrieves a specific assignment by its id.

HTTP Request

GET https://api.wanikani.com/v2/assignments/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the assignment.
Notes

The unlocked_at, started_at, passed_at, and burned_at timestamps are always in sequential order — assignments can't be started before they're unlocked, passed before they're started, etc.

Start an Assignment

Example Request

curl "https://api.wanikani.com/v2/assignments/80463006/start" \
  -X "PUT" \
  -H "Wanikani-Revision: 20170710" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer <api_token_here>" \
  -d $'{
       "assignment": {
         "started_at": "2017-09-05T23:41:28.980679Z"
       }
     }'

var apiToken = '<api_token_here>';
var apiEndpointPath = 'assignments/80463006/start';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'PUT',
    headers: requestHeaders,
    body: {
      "assignment": {
        "started_at": "2017-09-05T23:41:28.980679Z"
      }
    }
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 80463006,
  "object": "assignment",
  "url": "https://api.wanikani.com/v2/assignments/80463006",
  "data_updated_at": "2017-11-29T19:37:03.571377Z",
  "data": {
    "created_at": "2017-09-05T23:38:10.695133Z",
    "subject_id": 8761,
    "subject_type": "radical",
    "level": 1,
    "srs_stage": 1,
    "unlocked_at": "2017-09-05T23:38:10.695133Z",
    "started_at": "2017-09-05T23:41:28.980679Z",
    "passed_at": null,
    "burned_at": null,
    "available_at": "2018-02-27T00:00:00.000000Z",
    "resurrected_at": null
  }
}


Mark the assignment as started, moving the assignment from the lessons queue to the review queue. Returns the updated assignment.

HTTP Request

PUT https://api.wanikani.com/v2/assignments/<id>/start

Allowed Parameters
Name	Data Type	Required?
started_at	Date	false

Notes:

If not set, started_at will default to the time the request is made.
started_at must be greater than or equal to unlocked_at.
Expected Starting State

The assignment must be in the following valid state:

Attribute	State
level	Must be less than or equal to the lowest value of User's level and subscription.max_level_granted
srs_stage	Must be equal to 0
started_at	Must be equal to null
unlocked_at	Must not be null
Updated Attributes
Attribute	New Value
available_at	ISO8601 String timestamp
srs_stage	1
started_at	ISO8601 String timestamp
Level Progressions

Level progressions contain information about a user's progress through the WaniKani levels.

A level progression is created when a user has met the prerequisites for leveling up, which are:

Reach a 90% passing rate on assignments for a user's current level with a subject_type of kanji. Passed assignments have data.passed equal to true and a data.passed_at that's in the past.
Have access to the level. Under /user, the data.level must be less than or equal to data.subscription.max_level_granted.
Level Progression Data Structure

Example Structure

{
  "id": 49392,
  "object": "level_progression",
  "url": "https://api.wanikani.com/v2/level_progressions/49392",
  "data_updated_at": "2017-03-30T11:31:20.438432Z",
  "data": {
    "created_at": "2017-03-30T08:21:51.439918Z",
    "level": 42,
    "unlocked_at": "2017-03-30T08:21:51.439918Z",
    "started_at": "2017-03-30T11:31:20.438432Z",
    "passed_at": null,
    "completed_at": null,
    "abandoned_at": null
  }
}

Attribute	Possible Values	Description
abandoned_at	null or Date	Timestamp when the user abandons the level. This is primary used when the user initiates a reset.
completed_at	null or Date	Timestamp when the user burns 100% of the assignments belonging to the associated subject's level.
created_at	Date	Timestamp when the level progression is created
level	Integer	The level of the progression, with possible values from 1 to 60.
passed_at	null or Date	Timestamp when the user passes at least 90% of the assignments with a type of kanji belonging to the associated subject's level.
started_at	null or Date	Timestamp when the user starts their first lesson of a subject belonging to the level.
unlocked_at	null or Date	Timestamp when the user can access lessons and reviews for the level.
Get All Level Progressions

Example Request

curl "https://api.wanikani.com/v2/level_progressions" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'level_progressions';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/level_progressions",
  "pages": {
    "per_page": 500,
    "next_url": null,
    "previous_url": null
  },
  "total_count": 42,
  "data_updated_at": "2017-09-21T11:45:01.691388Z",
  "data": [
    {
      "id": 49392,
      "object": "level_progression",
      "url": "https://api.wanikani.com/v2/level_progressions/49392",
      "data_updated_at": "2017-03-30T11:31:20.438432Z",
      "data": {
        "created_at": "2017-03-30T08:21:51.439918Z",
        "level": 42,
        "unlocked_at": "2017-03-30T08:21:51.439918Z",
        "started_at": "2017-03-30T11:31:20.438432Z",
        "passed_at": null,
        "completed_at": null,
        "abandoned_at": null
      }
    }
  ]
}


Returns a collection of all level progressions, ordered by ascending created_at, 500 at a time.

 Logging for this endpoint has been implemented late in the application's life. Therefore, some Users will not have a full history.
HTTP Request

GET https://api.wanikani.com/v2/level_progressions

Query Parameters

The collection of assignments will be filtered on the parameters provided.

Name	Permitted values	Description
ids	Array of integers	Only level progressions where data.id matches one of the array values are returned.
updated_after	Date	Only level_progressions updated after this time are returned.
Get a Specific Level Progression

Example Request

curl "https://api.wanikani.com/v2/level_progressions/49392" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'level_progressions/49392';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 49392,
  "object": "level_progression",
  "url": "https://api.wanikani.com/v2/level_progressions/49392",
  "data_updated_at": "2017-03-30T11:31:20.438432Z",
  "data": {
    "created_at": "2017-03-30T08:21:51.439918Z",
    "level": 42,
    "unlocked_at": "2017-03-30T08:21:51.439918Z",
    "started_at": "2017-03-30T11:31:20.438432Z",
    "passed_at": null,
    "completed_at": null,
    "abandoned_at": null
  }
}


Retrieves a specific level progression by its id.

HTTP Request

GET https://api.wanikani.com/v2/level_progressions/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the level progression.
Notes

The unlocked_at, started_at, passed_at, and completed_at timestamps are always in sequential order — level progressions can't be started before they're unlocked, passed before they're started, etc.

Resets

Users can reset their progress back to any level at or below their current level. When they reset to a particular level, all of the assignments and review_statistics at that level or higher are set back to their default state.

Resets contain information about when those resets happen, the starting level, and the target level.

Reset Data Structure

Example Structure

{
  "id": 234,
  "object": "reset",
  "url": "https://api.wanikani.com/v2/resets/80463006",
  "data_updated_at": "2017-12-20T00:24:47.048380Z",
  "data": {
    "created_at": "2017-12-20T00:03:56.642838Z",
    "original_level": 42,
    "target_level": 8,
    "confirmed_at": "2017-12-19T23:31:18.077268Z"
  }
}


Attribute	Data Type	Description
confirmed_at	null or Date	Timestamp when the user confirmed the reset.
created_at	Date	Timestamp when the reset was created.
original_level	Integer	The user's level before the reset, from 1 to 60
target_level	Integer	The user's level after the reset, from 1 to 60. It must be less than or equal to original_level.
Get All Resets

Example Request

curl "https://api.wanikani.com/v2/resets" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'resets';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/resets",
  "pages": {
    "per_page": 500,
    "next_url": null,
    "previous_url": null
  },
  "total_count": 2,
  "data_updated_at": "2017-11-29T19:37:03.571377Z",
  "data": [
    {
      "id": 234,
      "object": "reset",
      "url": "https://api.wanikani.com/v2/resets/80463006",
      "data_updated_at": "2017-12-20T00:24:47.048380Z",
      "data": {
        "created_at": "2017-12-20T00:03:56.642838Z",
        "original_level": 42,
        "target_level": 8,
        "confirmed_at": "2017-12-19T23:31:18.077268Z"
      }
    }
  ]
}


Returns a collection of all resets, ordered by ascending created_at, 500 at a time.

HTTP Request

GET https://api.wanikani.com/v2/resets

Query Parameters

The collection of resets will be filtered on the parameters provided.

Name	Permitted values	Description
ids	Array of integers	Only resets where data.id matches one of the array values are returned.
updated_after	Date	Only resets updated after this time are returned.
Get a Specific Reset

Example Request

curl "https://api.wanikani.com/v2/resets/234" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'resets/234';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 234,
  "object": "reset",
  "url": "https://api.wanikani.com/v2/resets/234",
  "data_updated_at": "2017-03-30T11:31:20.438432Z",
  "data": {
    "created_at": "2017-12-20T00:03:56.642838Z",
    "original_level": 42,
    "target_level": 8,
    "confirmed_at": "2017-12-19T23:31:18.077268Z"
  }
}


Retrieves a specific reset by its id.

HTTP Request

GET https://api.wanikani.com/v2/resets/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the reset.
Reviews

Reviews are submitted to update Assignments and associated Review Statistics records in WaniKani. Reviews are submitted when a user answers all the parts of a subject correctly once; some subjects have both meaning or reading parts, and some only have one or the other. Note that reviews are not to be submitted for the quizzes in lessons, instead the Start an Assignment endpoint should be used.

Review Data Structure

Example Structure

{
  "id": 534342,
  "object": "review",
  "url": "https://api.wanikani.com/v2/reviews/534342",
  "data_updated_at": "2017-12-20T01:00:59.255427Z",
  "data": {
    "created_at": "2017-12-20T01:00:59.255427Z",
    "assignment_id": 32132,
    "spaced_repetition_system_id": 1,
    "subject_id": 8,
    "starting_srs_stage": 4,
    "ending_srs_stage": 2,
    "incorrect_meaning_answers": 1,
    "incorrect_reading_answers": 0
  }
}

Attribute	Date Type	Description
assignment_id	Integer	Unique identifier of the associated assignment.
created_at	Date	Timestamp when the review was completed by the user.
ending_srs_stage	Integer	The SRS stage interval calculated from the number of correct and incorrect answers, with valid values ranging from 1 to 9
incorrect_meaning_answers	Integer	The number of times the user has answered the meaning incorrectly.
incorrect_reading_answers	Integer	The number of times the user has answered the reading incorrectly.
spaced_repetition_system_id	Integer	Unique identifier of the associated spaced_repetition_system.
starting_srs_stage	Integer	The starting SRS stage interval, with valid values ranging from 1 to 8
subject_id	Integer	Unique identifier of the associated subject.
Notes
Incorrect Answers

A subject (radical, kanji, vocabulary, and kana_vocabulary) may not require a meaning or reading. Therefore attributes incorrect_meaning_answers and incorrect_reading_answers will return a value of 0 for subjects which do not have the requirement.

Subject type	Answer types allowed
kana_vocabulary	Meaning
kanji	Meaning, Reading
radical	Meaning
vocabulary	Meaning, Reading
Spaced Repetition System

The associated spaced repetition system is the system used to do the SRS stage calculations at the time the review record was created. It does not necessarily mean it is the current spaced_repetition_system associated to subject. This is done to preserve history.

Get All Reviews

Example Request

curl "https://api.wanikani.com/v2/reviews" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'reviews';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/reviews",
  "pages": {
    "per_page": 1000,
    "next_url": null,
    "previous_url": null
  },
  "total_count": 0,
  "data_updated_at": "2017-12-20T01:10:17.578705Z",
  "data": []
}

 This endpoint is deprecated. We no longer store review data. Calling this endpoint will return an empty array of data.
HTTP Request

GET https://api.wanikani.com/v2/reviews

Get a Specific Review

Example Request

curl "https://api.wanikani.com/v2/reviews/534342" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'reviews/534342';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
    "error": "Not found",
    "code": 404
}

 This endpoint is deprecated. We no longer store review data. Calling this endpoint will always respond with an http 404 status code
HTTP Request

GET https://api.wanikani.com/v2/reviews/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the review.
Create a Review

Example Request

curl "https://api.wanikani.com/v2/reviews" \
  -X "POST" \
  -H "Wanikani-Revision: 20170710" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer <api_token_here>" \
  -d $'{
       "review": {
         "assignment_id": 1422,
         "incorrect_meaning_answers": 1,
         "incorrect_reading_answers": 2,
         "created_at": "2017-09-30T01:42:13.453291Z"
       }
     }'

var apiToken = '<api_token_here>';
var apiEndpointPath = 'reviews';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'POST',
    headers: requestHeaders,
    body: {
      "review": {
        "assignment_id": 1422,
        "incorrect_meaning_answers": 1,
        "incorrect_reading_answers": 2,
        "created_at": "2017-09-30T01:42:13.453291Z"
      }
    }
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 0,
  "object": "review",
  "url": "https://api.wanikani.com/v2/reviews/0",
  "data_updated_at": "2018-05-13T03:34:54.000000Z",
  "data": {
    "created_at": "2018-05-13T03:34:54.000000Z",
    "assignment_id": 1422,
    "spaced_repetition_system_id": 1,
    "subject_id": 997,
    "starting_srs_stage": 1,
    "ending_srs_stage": 1,
    "incorrect_meaning_answers": 1,
    "incorrect_reading_answers": 2
  },
  "resources_updated": {
    "assignment": {
      "id": 1422,
      "object": "assignment",
      "url": "https://api.wanikani.com/v2/assignments/1422",
      "data_updated_at": "2018-05-14T03:35:34.180006Z",
      "data": {
        "created_at": "2018-01-24T21:32:38.967244Z",
        "subject_id": 997,
        "subject_type": "vocabulary",
        "level": 2,
        "srs_stage": 1,
        "unlocked_at": "2018-01-24T21:32:39.888359Z",
        "started_at": "2018-01-24T21:52:47.926376Z",
        "passed_at": null,
        "burned_at": null,
        "available_at": "2018-05-14T07:00:00.000000Z",
        "resurrected_at": null,
        "passed": false,
        "resurrected": false,
        "hidden": false
      }
    },
    "review_statistic": {
      "id": 342,
      "object": "review_statistic",
      "url": "https://api.wanikani.com/v2/review_statistics/342",
      "data_updated_at": "2018-05-14T03:35:34.223515Z",
      "data": {
        "created_at": "2018-01-24T21:35:55.127513Z",
        "subject_id": 997,
        "subject_type": "vocabulary",
        "meaning_correct": 1,
        "meaning_incorrect": 1,
        "meaning_max_streak": 1,
        "meaning_current_streak": 1,
        "reading_correct": 1,
        "reading_incorrect": 2,
        "reading_max_streak": 1,
        "reading_current_streak": 1,
        "percentage_correct": 67,
        "hidden": false
      }
    }
  }
}


Updates an assignment and associated review statisitc for a specific assignment_id. Using the related subject_id is also a valid alternative to using assignment_id.

Some criteria must be met in order for an assignment to be updated: available_at must be not null and in the past.

When a review is registered, the associated assignment and review_statistic are both updated. These are returned in the response body under resources_updated.

 We no longer persist review data. In order to honor the API contract, we return an unpersisted review with an id that is always 0.
HTTP Request

POST https://api.wanikani.com/v2/reviews/

Allowed Parameters
Name	Data Type	Required?	Description
assignment_id	Integer	true	Unique identifier of the assignment. This or subject_id must be set.
subject_id	Integer	true	Unique identifier of the subject. This or assignment_id must be set.
incorrect_meaning_answers	Integer	true	Must be zero or a positive number. This is the number of times the meaning was answered incorrectly.
incorrect_reading_answers	Integer	true	Must be zero or a positive number. This is the number of times the reading was answered incorrectly. Note that subjects with a type or radical do not quiz on readings. Thus, set this value to 0.
created_at	Date	false	Timestamp when the review was completed. Defaults to the time of the request if omitted from the request body. Must be in the past, but after assignment.available_at.
Review Statistics

Review statistics summarize the activity recorded in reviews. They contain sum the number of correct and incorrect answers for both meaning and reading. They track current and maximum streaks of correct answers. They store the overall percentage of correct answers versus total answers.

A review statistic is created when the user has done their first review on the related subject.

Review Statistic Data Structure

Example Structure

{
  "id": 80461982,
  "object": "review_statistic",
  "url": "https://api.wanikani.com/v2/review_statistics/80461982",
  "data_updated_at": "2018-04-03T11:50:31.558505Z",
  "data": {
    "created_at": "2017-09-05T23:38:10.964821Z",
    "subject_id": 8761,
    "subject_type": "radical",
    "meaning_correct": 8,
    "meaning_incorrect": 0,
    "meaning_max_streak": 8,
    "meaning_current_streak": 8,
    "reading_correct": 0,
    "reading_incorrect": 0,
    "reading_max_streak": 0,
    "reading_current_streak": 0,
    "percentage_correct": 100,
    "hidden": false
  }
}

Attribute	Data Type	Description
created_at	Date	Timestamp when the review statistic was created.
hidden	Boolean	Indicates if the associated subject has been hidden, preventing it from appearing in lessons or reviews.
meaning_correct	Integer	Total number of correct answers submitted for the meaning of the associated subject.
meaning_current_streak	Integer	The current, uninterrupted series of correct answers given for the meaning of the associated subject.
meaning_incorrect	Integer	Total number of incorrect answers submitted for the meaning of the associated subject.
meaning_max_streak	Integer	The longest, uninterrupted series of correct answers ever given for the meaning of the associated subject.
percentage_correct	Integer	The overall correct answer rate by the user for the subject, including both meaning and reading.
reading_correct	Integer	Total number of correct answers submitted for the reading of the associated subject.
reading_current_streak	Integer	The current, uninterrupted series of correct answers given for the reading of the associated subject.
reading_incorrect	Integer	Total number of incorrect answers submitted for the reading of the associated subject.
reading_max_streak	Integer	The longest, uninterrupted series of correct answers ever given for the reading of the associated subject.
subject_id	Integer	Unique identifier of the associated subject.
subject_type	String	The type of the associated subject, one of: kana_vocabulary, kanji, radical, or vocabulary.
Notes
Percentage correct can be calculated by rounding the result of ((meaning_correct + reading_correct) / (meaning_correct + reading_correct + meaning_incorrect + reading_incorrect)) * 100
Get All Review Statistics

Example Request

curl "https://api.wanikani.com/v2/review_statistics" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'review_statistics';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/review_statistics",
  "pages": {
    "per_page": 500,
    "next_url": "https://api.wanikani.com/v2/review_statistics?page_after_id=80461982",
    "previous_url": null
  },
  "total_count": 980,
  "data_updated_at": "2018-04-06T14:43:14.337681Z",
  "data": [
    {
      "id": 80461982,
      "object": "review_statistic",
      "url": "https://api.wanikani.com/v2/review_statistics/80461982",
      "data_updated_at": "2018-04-03T11:50:31.558505Z",
      "data": {
        "created_at": "2017-09-05T23:38:10.964821Z",
        "subject_id": 8761,
        "subject_type": "radical",
        "meaning_correct": 8,
        "meaning_incorrect": 0,
        "meaning_max_streak": 8,
        "meaning_current_streak": 8,
        "reading_correct": 0,
        "reading_incorrect": 0,
        "reading_max_streak": 0,
        "reading_current_streak": 0,
        "percentage_correct": 100,
        "hidden": false
      }
    }
  ]
}


Returns a collection of all review statistics, ordered by ascending created_at, 500 at a time.

HTTP Request

GET https://api.wanikani.com/v2/review_statistics

Query Parameters

The collection of review statistics will be filtered on the parameters provided.

Name	Data Type	Description
hidden	Boolean	Return review statistics with a matching value in the hidden attribute
ids	Array of integers	Only review statistics where data.id matches one of the array values are returned.
percentages_greater_than	Integer	Return review statistics where the percentage_correct is greater than the value.
percentages_less_than	Integer	Return review statistics where the percentage_correct is less than the value.
subject_ids	Array of integers	Only review statistics where data.subject_id matches one of the array values are returned.
subject_types	Array of strings	Only review statistics where data.subject_type matches one of the array values are returned. Valid values are: kana_vocabulary, kanji, radical, or vocabulary.
updated_after	Date	Only review statistics updated after this time are returned.
Get a Specific Review Statistic

Example Request

curl "https://api.wanikani.com/v2/review_statistics/80461982" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'review_statistics/80461982';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 80461982,
  "object": "review_statistic",
  "url": "https://api.wanikani.com/v2/review_statistics/80461982",
  "data_updated_at": "2018-04-03T11:50:31.558505Z",
  "data": {
    "created_at": "2017-09-05T23:38:10.964821Z",
    "subject_id": 8761,
    "subject_type": "radical",
    "meaning_correct": 8,
    "meaning_incorrect": 0,
    "meaning_max_streak": 8,
    "meaning_current_streak": 8,
    "reading_correct": 0,
    "reading_incorrect": 0,
    "reading_max_streak": 0,
    "reading_current_streak": 0,
    "percentage_correct": 100,
    "hidden": false
  }
}


Retrieves a specific review statistic by its id.

HTTP Request

GET https://api.wanikani.com/v2/review_statistics/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the review_statistic.
Spaced Repetition Systems

Available spaced repetition systems used for calculating srs_stage changes to Assignments and Reviews. Has relationship with Subjects

Spaced Repetition System Data Structure

Example Structure

{
  "id": 1,
  "object": "spaced_repetition_system",
  "url": "https://api.wanikani.com/v2/spaced_repetition_systems/1",
  "data_updated_at": "2020-05-27T16:42:06.705681Z",
  "data": {
    "created_at": "2020-05-21T20:46:06.464460Z",
    "name": "Default system for dictionary subjects",
    "description": "The original spaced repetition system",
    "unlocking_stage_position": 0,
    "starting_stage_position": 1,
    "passing_stage_position": 5,
    "burning_stage_position": 9,
    "stages": [
      {
        "interval": null,
        "position": 0,
        "interval_unit": null
      },
      {
        "interval": 14400,
        "position": 1,
        "interval_unit": "seconds"
      },
      {
        "interval": 28800,
        "position": 2,
        "interval_unit": "seconds"
      },
      {
        "interval": 82800,
        "position": 3,
        "interval_unit": "seconds"
      },
      {
        "interval": 169200,
        "position": 4,
        "interval_unit": "seconds"
      },
      {
        "interval": 601200,
        "position": 5,
        "interval_unit": "seconds"
      },
      {
        "interval": 1206000,
        "position": 6,
        "interval_unit": "seconds"
      },
      {
        "interval": 2588400,
        "position": 7,
        "interval_unit": "seconds"
      },
      {
        "interval": 10364400,
        "position": 8,
        "interval_unit": "seconds"
      },
      {
        "interval": null,
        "position": 9,
        "interval_unit": null
      }
    ]
  }
}

Attribute	Data Type	Description
burning_stage_position	Integer	position of the burning stage.
created_at	Date	Timestamp when the spaced_repetition_system was created.
description	String	Details about the spaced repetition system.
name	String	The name of the spaced repetition system
passing_stage_position	Integer	position of the passing stage.
stages	Array of objects	A collection of stages. See table below for the object structure.
starting_stage_position	Integer	position of the starting stage.
unlocking_stage_position	Integer	position of the unlocking stage.

The _position fields align with the timestamps on assignment: unlocking_stage_position => unlocked_at, passing_stage_position => passed_at, etc.

Stages Object Attributes
Attribute	Data Type	Description
interval	null or Integer	The length of time added to the time of review registration, adjusted to the beginning of the hour.
interval_unit	null or String	Unit of time. Can be the following: milliseconds, seconds, minutes, hours, days, and weeks.
position	Integer	The position of the stage within the continuous order.

The unlocking (position 0) and burning (maximum position) will always have null for interval and interval_unit since the stages do not influence assignment.available_at. Stages in between the unlocking and burning stages are the “reviewable” stages.

Get All Spaced Repetition Systems

Example Request

curl "https://api.wanikani.com/v2/spaced_repetition_systems" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'spaced_repetition_systems';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/spaced_repetition_systems",
  "pages": {
    "per_page": 500,
    "next_url": null,
    "previous_url": null
  },
  "total_count": 2,
  "data_updated_at": "2020-06-09T03:38:01.007395Z",
  "data": [
    {
      "id": 1,
      "object": "spaced_repetition_system",
      "url": "https://api.wanikani.com/v2/spaced_repetition_systems/1",
      "data_updated_at": "2020-06-09T03:36:51.134752Z",
      "data": {
        "created_at": "2020-05-21T20:46:06.464460Z",
        "name": "Default system for dictionary subjects",
        "description": "The original spaced repetition system",
        "unlocking_stage_position": 0,
        "starting_stage_position": 1,
        "passing_stage_position": 5,
        "burning_stage_position": 9,
        "stages": [
          {
            "interval": null,
            "position": 0,
            "interval_unit": null
          },
          {
            "interval": 14400,
            "position": 1,
            "interval_unit": "seconds"
          },
          {
            "interval": 28800,
            "position": 2,
            "interval_unit": "seconds"
          },
          {
            "interval": 82800,
            "position": 3,
            "interval_unit": "seconds"
          },
          {
            "interval": 169200,
            "position": 4,
            "interval_unit": "seconds"
          },
          {
            "interval": 601200,
            "position": 5,
            "interval_unit": "seconds"
          },
          {
            "interval": 1206000,
            "position": 6,
            "interval_unit": "seconds"
          },
          {
            "interval": 2588400,
            "position": 7,
            "interval_unit": "seconds"
          },
          {
            "interval": 10364400,
            "position": 8,
            "interval_unit": "seconds"
          },
          {
            "interval": null,
            "position": 9,
            "interval_unit": null
          }
        ]
      }
    },
    {
      "id": 2,
      "object": "spaced_repetition_system",
      "url": "https://api.wanikani.com/v2/spaced_repetition_systems/2",
      "data_updated_at": "2020-06-09T03:38:01.007395Z",
      "data": {
        "created_at": "2020-05-21T20:48:06.470578Z",
        "name": "Default accelerated system for dictionary subjects",
        "description": "The original spaced repetition system, but accelerated",
        "unlocking_stage_position": 0,
        "starting_stage_position": 1,
        "passing_stage_position": 5,
        "burning_stage_position": 9,
        "stages": [
          {
            "interval": null,
            "position": 0,
            "interval_unit": null
          },
          {
            "interval": 7200,
            "position": 1,
            "interval_unit": "seconds"
          },
          {
            "interval": 14400,
            "position": 2,
            "interval_unit": "seconds"
          },
          {
            "interval": 28800,
            "position": 3,
            "interval_unit": "seconds"
          },
          {
            "interval": 82800,
            "position": 4,
            "interval_unit": "seconds"
          },
          {
            "interval": 601200,
            "position": 5,
            "interval_unit": "seconds"
          },
          {
            "interval": 1206000,
            "position": 6,
            "interval_unit": "seconds"
          },
          {
            "interval": 2588400,
            "position": 7,
            "interval_unit": "seconds"
          },
          {
            "interval": 10364400,
            "position": 8,
            "interval_unit": "seconds"
          },
          {
            "interval": null,
            "position": 9,
            "interval_unit": null
          }
        ]
      }
    }
  ]
}


Returns a collection of all spaced_repetition_systems, ordered by ascending id, 500 at a time.

HTTP Request

GET https://api.wanikani.com/v2/spaced_repetition_systems

Query Parameters

The collection of spaced_repetition_systems will be filtered on the parameters provided.

Name	Permitted values	Description
ids	Array of integers	Only spaced_repetition_systems where data.id matches one of the array values are returned.
updated_after	Date	Only spaced_repetition_systems updated after this time are returned.
Get a Specific Spaced Repetition System

Example Request

curl "https://api.wanikani.com/v2/spaced_repetition_systems/1" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'spaced_repetition_systems/1';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 1,
  "object": "spaced_repetition_system",
  "url": "https://api.wanikani.com/v2/spaced_repetition_systems/1",
  "data_updated_at": "2020-05-27T16:42:06.705681Z",
  "data": {
    "created_at": "2020-05-21T20:46:06.464460Z",
    "name": "Default system for dictionary subjects",
    "description": "The original spaced repetition system",
    "unlocking_stage_position": 0,
    "starting_stage_position": 1,
    "passing_stage_position": 5,
    "burning_stage_position": 9,
    "stages": [
      {
        "interval": null,
        "position": 0,
        "interval_unit": null
      },
      {
        "interval": 14400,
        "position": 1,
        "interval_unit": "seconds"
      },
      {
        "interval": 28800,
        "position": 2,
        "interval_unit": "seconds"
      },
      {
        "interval": 82800,
        "position": 3,
        "interval_unit": "seconds"
      },
      {
        "interval": 169200,
        "position": 4,
        "interval_unit": "seconds"
      },
      {
        "interval": 601200,
        "position": 5,
        "interval_unit": "seconds"
      },
      {
        "interval": 1206000,
        "position": 6,
        "interval_unit": "seconds"
      },
      {
        "interval": 2588400,
        "position": 7,
        "interval_unit": "seconds"
      },
      {
        "interval": 10364400,
        "position": 8,
        "interval_unit": "seconds"
      },
      {
        "interval": null,
        "position": 9,
        "interval_unit": null
      }
    ]
  }
}


Retrieves a specific spaced_repetition_system by its id.

HTTP Request

GET https://api.wanikani.com/v2/spaced_repetition_systems/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the spaced_repetition_system.
Study Materials

Study materials store user-specific notes and synonyms for a given subject. The records are created as soon as the user enters any study information.

Study Material Data Structure

Example Structure

{
  "id": 65231,
  "object": "study_material",
  "url": "https://api.wanikani.com/v2/study_materials/65231",
  "data_updated_at": "2017-09-30T01:42:13.453291Z",
  "data": {
    "created_at": "2017-09-30T01:42:13.453291Z",
    "subject_id": 241,
    "subject_type": "radical",
    "meaning_note": "I like turtles",
    "reading_note": "I like たrtles",
    "meaning_synonyms": ["burn", "sizzle"]
  }
}

Attribute	Data Type	Description
created_at	Date	Timestamp when the study material was created.
hidden	Boolean	Indicates if the associated subject has been hidden, preventing it from appearing in lessons or reviews.
meaning_note	String	Free form note related to the meaning(s) of the associated subject.
meaning_synonyms	Array	Synonyms for the meaning of the subject. These are used as additional correct answers during reviews.
reading_note	String	Free form note related to the reading(s) of the associated subject.
subject_id	Integer	Unique identifier of the associated subject.
subject_type	String	The type of the associated subject, one of: kana_vocabulary, kanji, radical, or vocabulary.
Get All Study Materials

Example Request

curl "https://api.wanikani.com/v2/study_materials" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'study_materials';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/study_materials",
  "pages": {
    "per_page": 500,
    "next_url": "https://api.wanikani.com/v2/study_materials?page_after_id=52342",
    "previous_url": null
  },
  "total_count": 88,
  "data_updated_at": "2017-12-21T22:42:11.468155Z",
  "data": [
    {
      "id": 65231,
      "object": "study_material",
      "url": "https://api.wanikani.com/v2/study_materials/65231",
      "data_updated_at": "2017-09-30T01:42:13.453291Z",
      "data": {
        "created_at": "2017-09-30T01:42:13.453291Z",
        "subject_id": 241,
        "subject_type": "radical",
        "meaning_note": "I like turtles",
        "reading_note": "I like durtles",
        "meaning_synonyms": ["burn", "sizzle"]
      }
    }
  ]
}


Returns a collection of all study material, ordered by ascending created_at, 500 at a time.

HTTP Request

GET https://api.wanikani.com/v2/study_materials

Query Parameters

The collection of study material records will be filtered on the parameters provided.

Name	Data Type	Description
hidden	Boolean	Return study materials with a matching value in the hidden attribute
ids	Array of integers	Only study material records where data.id matches one of the array values are returned.
subject_ids	Array of integers	Only study material records where data.subject_id matches one of the array values are returned.
subject_types	Array of strings	Only study material records where data.subject_type matches one of the array values are returned. Valid values are: kana_vocabulary, kanji, radical, or vocabulary.
updated_after	Date	Only study material records updated after this time are returned.
Examples
Study Materials Updated Since Yesterday

Assumptions:

Date time now is November 11, 2017 8:42:00 AM UTC:

https://api.wanikani.com/v2/study_materials?updated_after=2017-10-11T10:42:00Z

Get a Specific Study Material

Example Request

curl "https://api.wanikani.com/v2/study_materials/65231" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'study_materials/65231';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
 "id": 65231,
 "object": "study_material",
 "url": "https://api.wanikani.com/v2/study_materials/65231",
 "data_updated_at": "2017-09-30T01:42:13.453291Z",
 "data": {
   "created_at": "2017-09-30T01:42:13.453291Z",
   "subject_id": 241,
   "subject_type": "radical",
   "meaning_note": "I like turtles",
   "reading_note": "I like durtles",
   "meaning_synonyms": ["burn", "sizzle"]
 }
}


Retrieves a specific study material by its id.

HTTP Request

GET https://api.wanikani.com/v2/study_materials/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the study material.
Create a Study Material

Example Request

curl "https://api.wanikani.com/v2/study_materials" \
  -X "POST" \
  -H "Wanikani-Revision: 20170710" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer <api_token_here>" \
  -d $'{
       "study_material": {
         "subject_id": 2,
         "meaning_note": "The two grounds is too much",
         "reading_note": "This is tsu much",
         "meaning_synonyms": [
           "double"
         ]
       }
     }'

var apiToken = '<api_token_here>';
var apiEndpointPath = 'study_materials';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'POST',
    headers: requestHeaders,
    body: {
      "study_material": {
        "subject_id": 2,
        "meaning_note": "The two grounds is too much",
        "reading_note": "This is tsu much",
        "meaning_synonyms": [
          "double"
        ]
      }
    }
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
 "id": 234,
 "object": "study_material",
 "url": "https://api.wanikani.com/v2/study_materials/234",
 "data_updated_at": "2017-09-30T01:42:13.453291Z",
 "data": {
   "created_at": "2017-09-30T01:42:13.453291Z",
   "subject_id": 2,
   "subject_type": "kanji",
   "meaning_note": "The two grounds is too much",
   "reading_note": "This is tsu much",
   "meaning_synonyms": ["double"]
 }
}


Creates a study material for a specific subject_id.

The owner of the api key can only create one study_material per subject_id.

HTTP Request

POST https://api.wanikani.com/v2/study_materials/

Parameters
Name	Data Type	Required?	Description
subject_id	Integer	true	Unique identifier of the subject.
meaning_note	String	false	Meaning notes specific for the subject.
reading_note	String	false	Reading notes specific for the subject.
meaning_synonyms	Array of Strings	false	Meaning synonyms for the subject.
Update a Study Material

Example Request

curl "https://api.wanikani.com/v2/study_materials/234" \
  -X "PUT" \
  -H "Wanikani-Revision: 20170710" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer <api_token_here>" \
  -d $'{
       "study_material": {
         "meaning_note": "The two grounds are on top of each other",
         "reading_note": "This is too tsu much",
         "meaning_synonyms": [
           "double",
           "twice"
         ]
       }
     }'

var apiToken = '<api_token_here>';
var apiEndpointPath = 'study_materials/234';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'PUT',
    headers: requestHeaders,
    body: {
      "study_material": {
        "meaning_note": "The two grounds are on top of each other",
        "reading_note": "This is too tsu much",
        "meaning_synonyms": [
          "double",
          "twice"
        ]
      }
    }
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
 "id": 234,
 "object": "study_material",
 "url": "https://api.wanikani.com/v2/study_materials/234",
 "data_updated_at": "2017-10-15T06:23:43.345321Z",
 "data": {
   "created_at": "2017-09-30T01:42:13.453291Z",
   "subject_id": 2,
   "subject_type": "kanji",
   "meaning_note": "The two grounds are on top of each other",
   "reading_note": "This is too tsu much",
   "meaning_synonyms": ["double", "twice"]
 }
}


Updates a study material for a specific id.

HTTP Request

PUT https://api.wanikani.com/v2/study_materials/234

Parameters
Name	Data Type	Required?	Description
meaning_note	String	false	Meaning notes specific for the subject.
reading_note	String	false	Reading notes specific for the subject.
meaning_synonyms	Array of Strings	false	Meaning synonyms for the subject.
Subjects

Subjects are the radicals, kanji, vocabulary, and kana_vocabulary that are learned through lessons and reviews. They contain basic dictionary information, such as meanings and/or readings, and information about their relationship to other items with WaniKani, like their level.

Subject Data Structure

The exact structure of a subject depends on the subject type. The available subject types are kana_vocabulary, kanji, radical, and vocabulary. Note that any attributes called out for the specific subject type behaves differently than the common attribute of the same name.

Common Attributes
Attribute	Data Type	Description
auxiliary_meanings	Array of objects	Collection of auxiliary meanings. See table below for the object structure.
characters	String	The UTF-8 characters for the subject, including kanji and hiragana.
created_at	Date	Timestamp when the subject was created.
document_url	String	A URL pointing to the page on wanikani.com that provides detailed information about this subject.
hidden_at	null or Date	Timestamp when the subject was hidden, indicating associated assignments will no longer appear in lessons or reviews and that the subject page is no longer visible on wanikani.com.
lesson_position	Integer	The position that the subject appears in lessons. Note that the value is scoped to the level of the subject, so there are duplicate values across levels.
level	Integer	The level of the subject, from 1 to 60.
meaning_mnemonic	String	The subject's meaning mnemonic.
meanings	Array of objects	The subject meanings. See table below for the object structure.
slug	String	The string that is used when generating the document URL for the subject. Radicals use their meaning, downcased. Kanji and vocabulary use their characters.
spaced_repetition_system_id	Integer	Unique identifier of the associated spaced_repetition_system.
Meaning Object Attributes
Attribute	Data Type	Description
meaning	String	A singular subject meaning.
primary	Boolean	Indicates priority in the WaniKani system.
accepted_answer	Boolean	Indicates if the meaning is used to evaluate user input for correctness.
Auxiliary Meaning Object Attributes
Attribute	Data Type	Description
meaning	String	A singular subject meaning.
type	String	Either whitelist or blacklist. When evaluating user input, whitelisted meanings are used to match for correctness. Blacklisted meanings are used to match for incorrectness.
Markup highlighting

One or many of these attributes can be present in radical, kanji, and vocabulary:

meaning_mnemonic
reading_mnemonic
meaning_hint
reading_hint

The strings can include a WaniKani specific markup syntax. The following is a list of markup used:

<radical></radical>
<kanji></kanji>
<vocabulary></vocabulary>
<meaning></meaning>
<reading></reading>
Radical Attributes

Example Structure

{
  "id": 1,
  "object": "radical",
  "url": "https://api.wanikani.com/v2/subjects/1",
  "data_updated_at": "2018-03-29T23:13:14.064836Z",
  "data": {
    "amalgamation_subject_ids": [
      5,
      4,
      98
    ],
    "auxiliary_meanings": [
      {
        "meaning": "ground",
        "type": "blacklist"
      }
    ],
    "characters": "一",
    "character_images": [
      {
        "url": "https://cdn.wanikani.com/images/legacy/576-subject-1.svg?1520987227",
        "metadata": {
          "inline_styles": true
        },
        "content_type": "image/svg+xml"
      }
    ],
    "created_at": "2012-02-27T18:08:16.000000Z",
    "document_url": "https://www.wanikani.com/radicals/ground",
    "hidden_at": null,
    "lesson_position": 1,
    "level": 1,
    "meanings": [
      {
        "meaning": "Ground",
        "primary": true,
        "accepted_answer": true
      }
    ],
    "meaning_mnemonic": "This radical consists of a single, horizontal stroke. What's the biggest, single, horizontal stroke? That's the ground. Look at the <radical>ground</radical>, look at this radical, now look at the ground again. Kind of the same, right?",
    "slug": "ground",
    "spaced_repetition_system_id": 2
  }
}

Attribute	Data Type	Description
amalgamation_subject_ids	Array of integers	An array of numeric identifiers for the kanji that have the radical as a component.
characters	String or null	Unlike kanji and vocabulary, radicals can have a null value for characters. Not all radicals have a UTF entry, so the radical must be visually represented with an image instead.
character_images	Array of objects	A collection of images of the radical. See table below for the object structure.
Character Image Object Attributes
Attribute	Data Type	Description
url	String	The location of the image.
content_type	String	The content type of the image. The API only delivers image/svg+xml.
metadata	Object	Details about the image. Each content_type returns a uniquely structured object.
Character Image Metadata Object Attributes

The metadata object differs depending on the content_type

When content_type is image/svg+xml
Attribute	Data Type	Description
inline_styles	Boolean	The SVG asset contains built-in CSS styling. This is currently always set to true and exists for historical reasons only.
Kanji Attributes

Example Structure

{
  "id": 440,
  "object": "kanji",
  "url": "https://api.wanikani.com/v2/subjects/440",
  "data_updated_at": "2018-03-29T23:14:30.805034Z",
  "data": {
    "amalgamation_subject_ids": [
      56,
      88,
      91
    ],
    "auxiliary_meanings": [
      {
        "meaning": "one",
        "type": "blacklist"
      },
      {
        "meaning": "flat",
        "type": "whitelist"
      }
    ],
    "characters": "一",
    "component_subject_ids": [
      1
    ],
    "created_at": "2012-02-27T19:55:19.000000Z",
    "document_url": "https://www.wanikani.com/kanji/%E4%B8%80",
    "hidden_at": null,
    "lesson_position": 2,
    "level": 1,
    "meanings": [
      {
        "meaning": "One",
        "primary": true,
        "accepted_answer": true
      }
    ],
    "meaning_hint": "To remember the meaning of <kanji>One</kanji>, imagine yourself there at the scene of the crime. You grab <kanji>One</kanji> in your arms, trying to prop it up, trying to hear its last words. Instead, it just splatters some blood on your face. \"Who did this to you?\" you ask. The number One points weakly, and you see number Two running off into an alleyway. He's always been jealous of number One and knows he can be number one now that he's taken the real number one out.",
    "meaning_mnemonic": "Lying on the <radical>ground</radical> is something that looks just like the ground, the number <kanji>One</kanji>. Why is this One lying down? It's been shot by the number two. It's lying there, bleeding out and dying. The number One doesn't have long to live.",
    "readings": [
      {
        "type": "onyomi",
        "primary": true,
        "accepted_answer": true,
        "reading": "いち"
      },
      {
        "type": "kunyomi",
        "primary": false,
        "accepted_answer": false,
        "reading": "ひと"
      },
      {
        "type": "nanori",
        "primary": false,
        "accepted_answer": false,
        "reading": "かず"
      }
    ],
    "reading_mnemonic": "As you're sitting there next to <kanji>One</kanji>, holding him up, you start feeling a weird sensation all over your skin. From the wound comes a fine powder (obviously coming from the special bullet used to kill One) that causes the person it touches to get extremely <reading>itchy</reading> (いち)",
    "reading_hint": "Make sure you feel the ridiculously <reading>itchy</reading> sensation covering your body. It climbs from your hands, where you're holding the number <kanji>One</kanji> up, and then goes through your arms, crawls up your neck, goes down your body, and then covers everything. It becomes uncontrollable, and you're scratching everywhere, writhing on the ground. It's so itchy that it's the most painful thing you've ever experienced (you should imagine this vividly, so you remember the reading of this kanji).",
    "slug": "一",
    "visually_similar_subject_ids": [],
    "spaced_repetition_system_id": 1
  }
}

Attribute	Data Type	Description
amalgamation_subject_ids	Array of integers	An array of numeric identifiers for the vocabulary that have the kanji as a component.
component_subject_ids	Array of integers	An array of numeric identifiers for the radicals that make up this kanji. Note that these are the subjects that must have passed assignments in order to unlock this subject's assignment.
meaning_hint	null or String	Meaning hint for the kanji.
reading_hint	null or String	Reading hint for the kanji.
reading_mnemonic	String	The kanji's reading mnemonic.
readings	Array of objects	Selected readings for the kanji. See table below for the object structure.
visually_similar_subject_ids	Array of integers	An array of numeric identifiers for kanji which are visually similar to the kanji in question.
Reading Object Attributes
Attribute	Data Type	Description
reading	String	A singular subject reading.
primary	Boolean	Indicates priority in the WaniKani system.
accepted_answer	Boolean	Indicates if the reading is used to evaluate user input for correctness.
type	String	The kanji reading's classfication: kunyomi, nanori, or onyomi.
Vocabulary Attributes

Example Structure

{
  "id": 2467,
  "object": "vocabulary",
  "url": "https://api.wanikani.com/v2/subjects/2467",
  "data_updated_at": "2018-12-12T23:09:52.234049Z",
  "data": {
    "auxiliary_meanings": [
      {
        "type": "whitelist",
        "meaning": "1"
      }
    ],
    "characters": "一",
    "component_subject_ids": [
      440
    ],
    "context_sentences": [
      {
        "en": "Let’s meet up once.",
        "ja": "一ど、あいましょう。"
      },
      {
        "en": "First place was an American.",
        "ja": "一いはアメリカ人でした。"
      },
      {
        "en": "I’m the weakest man in the world.",
        "ja": "ぼくはせかいで一ばんよわい。"
      }
    ],
    "created_at": "2012-02-28T08:04:47.000000Z",
    "document_url": "https://www.wanikani.com/vocabulary/%E4%B8%80",
    "hidden_at": null,
    "lesson_position": 44,
    "level": 1,
    "meanings": [
      {
        "meaning": "One",
        "primary": true,
        "accepted_answer": true
      }
    ],
    "meaning_mnemonic": "As is the case with most vocab words that consist of a single kanji, this vocab word has the same meaning as the kanji it parallels, which is \u003cvocabulary\u003eone\u003c/vocabulary\u003e.",
    "parts_of_speech": [
      "numeral"
    ],
    "pronunciation_audios": [
      {
        "url": "https://cdn.wanikani.com/audios/3020-subject-2467.mp3?1547862356",
        "metadata": {
          "gender": "male",
          "source_id": 2711,
          "pronunciation": "いち",
          "voice_actor_id": 2,
          "voice_actor_name": "Kenichi",
          "voice_description": "Tokyo accent"
        },
        "content_type": "audio/mpeg"
      },
      {
        "url": "https://cdn.wanikani.com/audios/3018-subject-2467.ogg?1547862356",
        "metadata": {
          "gender": "male",
          "source_id": 2711,
          "pronunciation": "いち",
          "voice_actor_id": 2,
          "voice_actor_name": "Kenichi",
          "voice_description": "Tokyo accent"
        },
        "content_type": "audio/ogg"
      }
    ],
    "readings": [
      {
        "primary": true,
        "reading": "いち",
        "accepted_answer": true
      }
    ],
    "reading_mnemonic": "When a vocab word is all alone and has no okurigana (hiragana attached to kanji) connected to it, it usually uses the kun'yomi reading. Numbers are an exception, however. When a number is all alone, with no kanji or okurigana, it is going to be the on'yomi reading, which you learned with the kanji.  Just remember this exception for alone numbers and you'll be able to read future number-related vocab to come.",
    "slug": "一",
    "spaced_repetition_system_id": 1
  }
}

Attribute	Data Type	Description
component_subject_ids	Array of integers	An array of numeric identifiers for the kanji that make up this vocabulary. Note that these are the subjects that must be have passed assignments in order to unlock this subject's assignment.
context_sentences	Array of objects	A collection of context sentences. See table below for the object structure.
meaning_mnemonic	String	The subject's meaning mnemonic.
parts_of_speech	Array of strings	Parts of speech.
pronunciation_audios	Array of objects	A collection of pronunciation audio. See table below for the object structure.
readings	Array of objects	Selected readings for the vocabulary. See table below for the object structure.
reading_mnemonic	String	The subject's reading mnemonic.
Reading Object Attributes
Attribute	Data Type	Description
accepted_answer	Boolean	Indicates if the reading is used to evaluate user input for correctness.
primary	Boolean	Indicates priority in the WaniKani system.
reading	String	A singular subject reading.
Context Sentence Object Attributes
Attribute	Data Type	Description
en	String	English translation of the sentence
ja	String	Japanese context sentence
Pronunciation Audio Object Attributes
Attribute	Data Type	Description
url	String	The location of the audio.
content_type	String	The content type of the audio. Currently the API delivers audio/mpeg and audio/ogg.
metadata	Object	Details about the pronunciation audio. See table below for details.
Pronunciation Audio Metadata Object Attributes
Attribute	Data Type	Description
gender	String	The gender of the voice actor.
source_id	Integer	A unique ID shared between same source pronunciation audio.
pronunciation	String	Vocabulary being pronounced in kana.
voice_actor_id	Integer	A unique ID belonging to the voice actor.
voice_actor_name	String	Humanized name of the voice actor.
voice_description	String	Description of the voice.
Kana Vocabulary Attributes

Example Structure

{
    "id": 9210,
    "object": "kana_vocabulary",
    "url": "https://api.wanikani.com/v2/subjects/9210",
    "data_updated_at": "2023-05-03T13:01:51.333012Z",
    "data": {
        "created_at": "2023-04-24T23:52:43.457614Z",
        "level": 8,
        "slug": "おやつ",
        "hidden_at": null,
        "document_url": "https://www.wanikani.com/vocabulary/おやつ",
        "characters": "おやつ",
        "meanings": [
            {
                "meaning": "Snack",
                "primary": true,
                "accepted_answer": true
            }
        ],
        "auxiliary_meanings": [],
        "parts_of_speech": [
            "noun"
        ],
        "meaning_mnemonic": "<reading>Oh yah! Two</reading> (<ja>おやつ</ja>) <vocabulary>snack</vocabulary>s, just for you. Imagine your two snacks. What are they? I bet they're delicious. Oh yah!\r\n\r\nYou can use <ja>おやつ</ja> to refer to a small amount of food eaten between meals, including candies and light meals like onigiri.",
        "context_sentences": [
            {
                "en": "Today I had a muffin for a snack.",
                "ja": "今日はおやつにマフィンを食べた。"
            },
            {
                "en": "Shall we take a snack break?",
                "ja": "そろそろおやつにする？"
            },
            {
                "en": "Kaori's snacks are always homemade!",
                "ja": "カオリちゃんのおやつは、いつも手作りだよ！"
            }
        ],
        "pronunciation_audios": [
            {
                "url": "https://files.wanikani.com/w4yp5o02betioucki05lp6x78quy",
                "metadata": {
                    "gender": "male",
                    "source_id": 44757,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 2,
                    "voice_actor_name": "Kenichi",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/webm"
            },
            {
                "url": "https://files.wanikani.com/qd82u8ijchzt196fiaoqxnv2ktmg",
                "metadata": {
                    "gender": "male",
                    "source_id": 44757,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 2,
                    "voice_actor_name": "Kenichi",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/ogg"
            },
            {
                "url": "https://files.wanikani.com/232ivelhhbvy5uhih0ozuyyxvjla",
                "metadata": {
                    "gender": "male",
                    "source_id": 44757,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 2,
                    "voice_actor_name": "Kenichi",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/mpeg"
            },
            {
                "url": "https://files.wanikani.com/8d1o3zi4nz6vdxyjyjgs47rmep6t",
                "metadata": {
                    "gender": "female",
                    "source_id": 44698,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 1,
                    "voice_actor_name": "Kyoko",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/webm"
            },
            {
                "url": "https://files.wanikani.com/dsri4976w1x9qm0zfm98ck7jqwge",
                "metadata": {
                    "gender": "female",
                    "source_id": 44698,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 1,
                    "voice_actor_name": "Kyoko",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/mpeg"
            },
            {
                "url": "https://files.wanikani.com/k1fdjcyvierz0ajmfjkxy0jjsabl",
                "metadata": {
                    "gender": "female",
                    "source_id": 44698,
                    "pronunciation": "おやつ",
                    "voice_actor_id": 1,
                    "voice_actor_name": "Kyoko",
                    "voice_description": "Tokyo accent"
                },
                "content_type": "audio/ogg"
            }
        ],
        "lesson_position": 0,
        "spaced_repetition_system_id": 1
    }
}

Attribute	Data Type	Description
context_sentences	Array of objects	A collection of context sentences. See table below for the object structure.
meaning_mnemonic	String	The subject's meaning mnemonic.
parts_of_speech	Array of strings	Parts of speech.
pronunciation_audios	Array of objects	A collection of pronunciation audio. See table below for the object structure.
Context Sentence Object Attributes
Attribute	Data Type	Description
en	String	English translation of the sentence
ja	String	Japanese context sentence
Pronunciation Audio Object Attributes
Attribute	Data Type	Description
url	String	The location of the audio.
content_type	String	The content type of the audio. Currently the API delivers audio/mpeg and audio/ogg.
metadata	Object	Details about the pronunciation audio. See table below for details.
Pronunciation Audio Metadata Object Attributes
Attribute	Data Type	Description
gender	String	The gender of the voice actor.
source_id	Integer	A unique ID shared between same source pronunciation audio.
pronunciation	String	Vocabulary being pronounced in kana.
voice_actor_id	Integer	A unique ID belonging to the voice actor.
voice_actor_name	String	Humanized name of the voice actor.
voice_description	String	Description of the voice.
Get All Subjects

Example Request

curl "https://api.wanikani.com/v2/subjects" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'subjects';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/subjects?types=kanji",
  "pages": {
    "per_page": 1000,
    "next_url": "https://api.wanikani.com/v2/subjects?page_after_id=1439\u0026types=kanji",
    "previous_url": null
  },
  "total_count": 2027,
  "data_updated_at": "2018-04-09T18:08:59.946969Z",
  "data": [
    {
      "id": 440,
      "object": "kanji",
      "url": "https://api.wanikani.com/v2/subjects/440",
      "data_updated_at": "2018-03-29T23:14:30.805034Z",
      "data": {
        "created_at": "2012-02-27T19:55:19.000000Z",
        "level": 1,
        "slug": "一",
        "hidden_at": null,
        "document_url": "https://www.wanikani.com/kanji/%E4%B8%80",
        "characters": "一",
        "meanings": [
          {
            "meaning": "One",
            "primary": true,
            "accepted_answer": true
          }
        ],
        "readings": [
          {
            "type": "onyomi",
            "primary": true,
            "accepted_answer": true,
            "reading": "いち"
          },
          {
            "type": "kunyomi",
            "primary": false,
            "accepted_answer": false,
            "reading": "ひと"
          },
          {
            "type": "nanori",
            "primary": false,
            "accepted_answer": false,
            "reading": "かず"
          }
        ],
        "component_subject_ids": [
          1
        ],
        "amalgamation_subject_ids": [
          56,
          88,
          91
        ],
        "visually_similar_subject_ids": [],
        "meaning_mnemonic": "Lying on the <radical>ground</radical> is something that looks just like the ground, the number <kanji>One</kanji>. Why is this One lying down? It's been shot by the number two. It's lying there, bleeding out and dying. The number One doesn't have long to live.",
        "meaning_hint": "To remember the meaning of <kanji>One</kanji>, imagine yourself there at the scene of the crime. You grab <kanji>One</kanji> in your arms, trying to prop it up, trying to hear its last words. Instead, it just splatters some blood on your face. \"Who did this to you?\" you ask. The number One points weakly, and you see number Two running off into an alleyway. He's always been jealous of number One and knows he can be number one now that he's taken the real number one out.",
        "reading_mnemonic": "As you're sitting there next to <kanji>One</kanji>, holding him up, you start feeling a weird sensation all over your skin. From the wound comes a fine powder (obviously coming from the special bullet used to kill One) that causes the person it touches to get extremely <reading>itchy</reading> (いち)",
        "reading_hint": "Make sure you feel the ridiculously <reading>itchy</reading> sensation covering your body. It climbs from your hands, where you're holding the number <kanji>One</kanji> up, and then goes through your arms, crawls up your neck, goes down your body, and then covers everything. It becomes uncontrollable, and you're scratching everywhere, writhing on the ground. It's so itchy that it's the most painful thing you've ever experienced (you should imagine this vividly, so you remember the reading of this kanji).",
        "lesson_position": 2,
        "spaced_repetition_system_id": 1
      }
    }
  ]
}


Returns a collection of all subjects, ordered by ascending created_at, 1000 at a time.

HTTP Request

GET https://api.wanikani.com/v2/subjects

Query Parameters

The collection of subjects will be filtered on the parameters provided.

Name	Data Type	Description
ids	Array of integers	Only subjects where data.id matches one of the array values are returned.
types	Array of strings	Return subjects of the specified types.
slugs	Array of strings	Return subjects of the specified slug.
levels	Array of integers	Return subjects at the specified levels.
hidden	Boolean	Return subjects which are or are not hidden from the user-facing application.
updated_after	Date	Only subjects updated after this time are returned.
Get a Specific Subject

Retrieves a specific subject by its id. The structure of the response depends on the subject type. See the section on subject data structure for details.

HTTP Request

GET https://api.wanikani.com/v2/subjects/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the subject.
Summary

The summary report contains currently available lessons and reviews and the reviews that will become available in the next 24 hours, grouped by the hour.

Summary Data Structure

Example Structure

{
  "object": "report",
  "url": "https://api.wanikani.com/v2/summary",
  "data_updated_at": "2018-04-11T21:00:00.000000Z",
  "data": {
    "lessons": [
      {
        "available_at": "2018-04-11T21:00:00.000000Z",
        "subject_ids": [
          25,
          26
        ]
      }
    ],
    "next_reviews_at": "2018-04-11T21:00:00.000000Z",
    "reviews": [
      {
        "available_at": "2018-04-11T21:00:00.000000Z",
        "subject_ids": [
          21,
          23,
          24
        ]
      },
      {
        "available_at": "2018-04-11T22:00:00.000000Z",
        "subject_ids": []
      },
      ...
    ]
  }
}

Attribute	Data Type	Description
lessons	Array of objects	Details about subjects available for lessons. See table below for object structure.
next_reviews_at	null or Date	Earliest date when the reviews are available. Is null when the user has no reviews scheduled.
reviews	Array of objects	Details about subjects available for reviews now and in the next 24 hours by the hour (total of 25 objects). See table below for object structure.
Lesson Object Attributes
Attribute	Data Type	Description
available_at	Date	When the paired subject_ids are available for lessons. Always beginning of the current hour when the API endpoint is accessed.
subject_ids	Array of integers	Collection of unique identifiers for subjects.
Review Object Attributes
Attribute	Data Type	Description
available_at	Date	When the paired subject_ids are available for reviews. All timestamps are the top of an hour.
subject_ids	Array of integers	Collection of unique identifiers for subjects.
Get a Summary

Example Request

curl "https://api.wanikani.com/v2/summary" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'summary';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "report",
  "url": "https://api.wanikani.com/v2/summary",
  "data_updated_at": "2018-04-11T21:00:00.000000Z",
  "data": {
    "lessons": [
      {
        "available_at": "2018-04-11T21:00:00.000000Z",
        "subject_ids": [
          25,
          26
        ]
      }
    ],
    "next_reviews_at": "2018-04-11T21:00:00.000000Z",
    "reviews": [
      {
        "available_at": "2018-04-11T21:00:00.000000Z",
        "subject_ids": [
          21,
          23,
          24
        ]
      },
      {
        "available_at": "2018-04-11T22:00:00.000000Z",
        "subject_ids": []
      },
      // ...
    ]
  }
}


Retrieves a summary report.

HTTP Request

GET https://api.wanikani.com/v2/summary

User

The user summary returns basic information for the user making the API request, identified by their API key.

User Data Structure

Example Structure

{
  "object": "user",
  "url": "https://api.wanikani.com/v2/user",
  "data_updated_at": "2018-04-06T14:26:53.022245Z",
  "data": {
    "id": "5a6a5234-a392-4a87-8f3f-33342afe8a42",
    "username": "example_user",
    "level": 5,
    "profile_url": "https://www.wanikani.com/users/example_user",
    "started_at": "2012-05-11T00:52:18.958466Z",
    "current_vacation_started_at": null,
    "subscription": {
      "active": true,
      "type": "recurring",
      "max_level_granted": 60,
      "period_ends_at": "2018-12-11T13:32:19.485748Z"
    },
    "preferences": {
      "default_voice_actor_id": 1,
      "extra_study_autoplay_audio": false,
      "lessons_autoplay_audio": false,
      "lessons_batch_size": 10,
      "lessons_presentation_order": "ascending_level_then_subject",
      "reviews_autoplay_audio": false,
      "reviews_display_srs_indicator": true,
      "reviews_presentation_order": "shuffled"
    }
  }
}

Attribute	Data Type	Description
current_vacation_started_at	null or Date	If the user is on vacation, this will be the timestamp of when that vacation started. If the user is not on vacation, this is null.
level	Integer	The current level of the user. This ignores subscription status.
preferences	Object	User settings specific to the WaniKani application. See table below for the object structure.
profile_url	String	The URL to the user's public facing profile page.
started_at	Date	The signup date for the user.
subscription	Object	Details about the user's subscription state. See table below for the object structure.
username	String	The user's username.
Preferences Object Attributes
Attribute	Data Type	Description
default_voice_actor_id	Integer	This is a deprecated user preference. It will always return 1 and cannot be set. It exists only to ensure existing consumers of this API don't break.
extra_study_autoplay_audio	Boolean	Automatically play pronunciation audio for vocabulary during extra study.
lessons_autoplay_audio	Boolean	Automatically play pronunciation audio for vocabulary during lessons.
lessons_batch_size	Integer	Number of subjects introduced to the user during lessons before quizzing.
lessons_presentation_order	String	This is a deprecated user preference. It always returns ascending_level_then_subject. Setting this preference will do nothing. It exists only to ensure existing consumers of this API don't break.
reviews_autoplay_audio	Boolean	Automatically play pronunciation audio for vocabulary during reviews.
reviews_display_srs_indicator	Boolean	Toggle for display SRS change indicator after a subject has been completely answered during review.
reviews_presentation_order	String	The order in which reviews are presented. The options are shuffled and lower_levels_first. The default (and best experience) is shuffled.
Subscription Object Attributes
Attribute	Data Type	Description
active	Boolean	Whether or not the user currently has a paid subscription.
max_level_granted	Integer	The maximum level of content accessible to the user for lessons, reviews, and content review. For unsubscribed/free users, the maximum level is 3. For subscribed users, this is 60. Any application that uses data from the WaniKani API must respect these access limits.
period_ends_at	null or Date	The date when the user's subscription period ends. If the user has subscription type lifetime or free then the value is null.
type	String	The type of subscription the user has. Options are following: free, recurring, and lifetime.
Get User Information

Example Request

curl "https://api.wanikani.com/v2/user" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'user';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "user",
  "url": "https://api.wanikani.com/v2/user",
  "data_updated_at": "2018-04-06T14:26:53.022245Z",
  "data": {
    "id": "5a6a5234-a392-4a87-8f3f-33342afe8a42",
    "username": "example_user",
    "level": 5,
    "profile_url": "https://www.wanikani.com/users/example_user",
    "started_at": "2012-05-11T00:52:18.958466Z",
    "current_vacation_started_at": null,
    "subscription": {
      "active": true,
      "type": "recurring",
      "max_level_granted": 60,
      "period_ends_at": "2018-12-11T13:32:19.485748Z"
    },
    "preferences": {
      "default_voice_actor_id": 1,
      "extra_study_autoplay_audio": false,
      "lessons_autoplay_audio": false,
      "lessons_batch_size": 5,
      "lessons_presentation_order": "ascending_level_then_subject",
      "reviews_autoplay_audio": false,
      "reviews_display_srs_indicator": true,
      "reviews_presentation_order": "shuffled"
    }
  }
}


Returns a summary of user information.

HTTP Request

GET https://api.wanikani.com/v2/user

Update User Information

Example Request

curl "https://api.wanikani.com/v2/user" \
  -X "PUT" \
  -H "Wanikani-Revision: 20170710" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer <api_token_here>" \
  -d $'{
       "user": {
         "preferences": {
           "lessons_autoplay_audio": true,
           "lessons_batch_size": 3,
           "reviews_autoplay_audio": true,
           "reviews_display_srs_indicator": false
         }
       }
     }'

var apiToken = '<api_token_here>';
var apiEndpointPath = 'user';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'PUT',
    headers: requestHeaders,
    body: {
      "user": {
        "preferences": {
          "lessons_autoplay_audio": true,
          "lessons_batch_size": 3,
          "reviews_autoplay_audio": true,
          "reviews_display_srs_indicator": false
        }
      }
    }
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "user",
  "url": "https://api.wanikani.com/v2/user",
  "data_updated_at": "2018-04-06T14:26:53.022245Z",
  "data": {
    "id": "5a6a5234-a392-4a87-8f3f-33342afe8a42",
    "username": "example_user",
    "level": 5,
    "profile_url": "https://www.wanikani.com/users/example_user",
    "started_at": "2012-05-11T00:52:18.958466Z",
    "current_vacation_started_at": null,
    "subscription": {
      "active": true,
      "type": "recurring",
      "max_level_granted": 60,
      "period_ends_at": "2018-12-11T13:32:19.485748Z"
    },
    "preferences": {
      "default_voice_actor_id": 1,
      "extra_study_autoplay_audio": false,
      "lessons_autoplay_audio": true,
      "lessons_batch_size": 3,
      "lessons_presentation_order": "ascending_level_then_subject",
      "reviews_autoplay_audio": true,
      "reviews_display_srs_indicator": false,
      "reviews_presentation_order": "shuffled"
    }
  }
}


Returns an updated summary of user information.

HTTP Request

PUT https://api.wanikani.com/v2/user

Allowed Parameters

Only the values under preferences are allowed to be updated.

Name	Data Type	Required?
extra_study_autoplay_audio	Boolean	false
lessons_autoplay_audio	Boolean	false
lessons_batch_size	Integer	false
reviews_autoplay_audio	Boolean	false
reviews_display_srs_indicator	Boolean	false
reviews_presentation_order	String	false
Voice actors

Available voice actors used for vocabulary reading pronunciation audio.

Voice Actor Data Structure

Example Structure

{
  "id": 234,
  "object": "voice_actor",
  "url": "https://api.wanikani.com/v2/voice_actors/1",
  "data_updated_at": "2017-12-20T00:24:47.048380Z",
  "data": {
    "created_at": "2017-12-20T00:03:56.642838Z",
    "name": "Kyoko",
    "gender": "female",
    "description": "Tokyo accent"
  }
}

Attribute	Data Type	Description
description	String	Details about the voice actor.
gender	String	male or female
name	String	The voice actor's name
Get All Voice Actors

Example Request

curl "https://api.wanikani.com/v2/voice_actors" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'voice_actors';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "object": "collection",
  "url": "https://api.wanikani.com/v2/voice_actors",
  "pages": {
    "per_page": 500,
    "next_url": null,
    "previous_url": null
  },
  "total_count": 2,
  "data_updated_at": "2017-11-29T19:37:03.571377Z",
  "data": [
    {
      "id": 234,
      "object": "voice_actor",
      "url": "https://api.wanikani.com/v2/voice_actors/1",
      "data_updated_at": "2017-12-20T00:24:47.048380Z",
      "data": {
        "created_at": "2017-12-20T00:03:56.642838Z",
        "name": "Kyoko",
        "gender": "female",
        "description": "Tokyo accent"
      }
    }
  ]
}


Returns a collection of all voice_actors, ordered by ascending created_at, 500 at a time.

HTTP Request

GET https://api.wanikani.com/v2/voice_actors

Query Parameters

The collection of voice_actors will be filtered on the parameters provided.

Name	Permitted values	Description
ids	Array of integers	Only voice_actors where data.id matches one of the array values are returned.
updated_after	Date	Only voice_actors updated after this time are returned.
Get a Specific Voice Actor

Example Request

curl "https://api.wanikani.com/v2/voice_actors/1" \
  -H "Wanikani-Revision: 20170710" \
  -H "Authorization: Bearer <api_token_here>"

var apiToken = '<api_token_here>';
var apiEndpointPath = 'voice_actors/1';
var requestHeaders =
  new Headers({
    'Wanikani-Revision': '20170710',
    Authorization: 'Bearer ' + apiToken,
  });
var apiEndpoint =
  new Request('https://api.wanikani.com/v2/' + apiEndpointPath, {
    method: 'GET',
    headers: requestHeaders
  });

fetch(apiEndpoint)
  .then(response => response.json())
  .then(responseBody => console.log(responseBody));


Example Response

{
  "id": 234,
  "object": "voice_actor",
  "url": "https://api.wanikani.com/v2/voice_actors/1",
  "data_updated_at": "2017-12-20T00:24:47.048380Z",
  "data": {
    "created_at": "2017-12-20T00:03:56.642838Z",
    "name": "Kyoko",
    "gender": "female",
    "description": "Tokyo accent"
  }
}


Retrieves a specific voice_actor by its id.

HTTP Request

GET https://api.wanikani.com/v2/voice_actors/<id>

Parameters
Name	Data Type	Description
id	Integer	Unique identifier of the voice_actor.
shell javascript