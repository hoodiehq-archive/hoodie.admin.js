!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.HoodieAdmin=e():"undefined"!=typeof global?global.HoodieAdmin=e():"undefined"!=typeof self&&(self.HoodieAdmin=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

function isPlainObject(obj) {
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
		return false;

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
		return false;

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for ( key in obj ) {}

	return key === undefined || hasOwn.call( obj, key );
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone,
	    target = arguments[0] || {},
	    i = 1,
	    length = arguments.length,
	    deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && typeof target !== "function") {
		target = {};
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];

					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

},{}],2:[function(require,module,exports){
// Open stores
// -------------

var hoodieRemoteStore = require('../lib/store/remote');
var extend = require('extend');

function hoodieOpen(hoodie) {

  // generic method to open a store.
  //
  //     hoodie.open("some_store_name").findAll()
  //
  function open(storeName, options) {
    options = options || {};

    extend(options, {
      name: storeName
    });

    return hoodieRemoteStore(hoodie, options);
  }

  //
  // Public API
  //
  hoodie.open = open;
}

module.exports = hoodieOpen;

},{"../lib/store/remote":9,"extend":1}],3:[function(require,module,exports){
//
// hoodie.request
// ================

// Hoodie's central place to send request to its backend.
// At the moment, it's a wrapper around jQuery's ajax method,
// but we might get rid of this dependency in the future.
//
// It has build in support for CORS and a standard error
// handling that normalizes errors returned by CouchDB
// to JavaScript's native conventions of errors having
// a name & a message property.
//
// Common errors to expect:
//
// * HoodieRequestError
// * HoodieUnauthorizedError
// * HoodieConflictError
// * HoodieServerError

var hoodiefyRequestErrorName = require('../utils/hoodiefy_request_error_name');
var extend = require('extend');
var rejectWith = require('../utils/promise/reject_with');

function hoodieRequest(hoodie) {
  var $ajax = $.ajax;

  // Hoodie backend listents to requests prefixed by /_api,
  // so we prefix all requests with relative URLs
  var API_PATH = '/_api';

  // Requests
  // ----------

  // sends requests to the hoodie backend.
  //
  //     promise = hoodie.request('GET', '/user_database/doc_id')
  //
  function request(type, url, options) {
    var defaults, requestPromise, pipedPromise;

    options = options || {};

    defaults = {
      type: type,
      dataType: 'json'
    };

    // if absolute path passed, set CORS headers

    // if relative path passed, prefix with baseUrl
    if (!/^http/.test(url)) {
      url = (hoodie.baseUrl || '') + API_PATH + url;
    }

    // if url is cross domain, set CORS headers
    if (/^http/.test(url)) {
      defaults.xhrFields = {
        withCredentials: true
      };
      defaults.crossDomain = true;
    }

    defaults.url = url;


    // we are piping the result of the request to return a nicer
    // error if the request cannot reach the server at all.
    // We can't return the promise of ajax directly because of
    // the piping, as for whatever reason the returned promise
    // does not have the `abort` method any more, maybe others
    // as well. See also http://bugs.jquery.com/ticket/14104
    requestPromise = $ajax(extend(defaults, options));
    pipedPromise = requestPromise.then( null, handleRequestError);
    pipedPromise.abort = requestPromise.abort;

    return pipedPromise;
  }

  //
  //
  //
  function handleRequestError(xhr) {
    var error;

    try {
      error = parseErrorFromResponse(xhr);
    } catch (_error) {

      if (xhr.responseText) {
        error = xhr.responseText;
      } else {
        error = {
          name: 'HoodieConnectionError',
          message: 'Could not connect to Hoodie server at {{url}}.',
          url: hoodie.baseUrl || '/'
        };
      }
    }

    return rejectWith(error).promise();
  }

  //
  // CouchDB returns errors in JSON format, with the properties
  // `error` and `reason`. Hoodie uses JavaScript's native Error
  // properties `name` and `message` instead, so we are normalizing
  // that.
  //
  // Besides the renaming we also do a matching with a map of known
  // errors to make them more clear. For reference, see
  // https://wiki.apache.org/couchdb/Default_http_errors &
  // https://github.com/apache/couchdb/blob/master/src/couchdb/couch_httpd.erl#L807
  //

  function parseErrorFromResponse(xhr) {
    var error = JSON.parse(xhr.responseText);

    // get error name
    error.name = HTTP_STATUS_ERROR_MAP[xhr.status];
    if (! error.name) {
      error.name = hoodiefyRequestErrorName(error.error);
    }

    // store status & message
    error.status = xhr.status;
    error.message = error.reason || '';
    error.message = error.message.charAt(0).toUpperCase() + error.message.slice(1);

    // cleanup
    delete error.error;
    delete error.reason;

    return error;
  }

  // map CouchDB HTTP status codes to Hoodie Errors
  var HTTP_STATUS_ERROR_MAP = {
    400: 'HoodieRequestError', // bad request
    401: 'HoodieUnauthorizedError',
    403: 'HoodieRequestError', // forbidden
    404: 'HoodieNotFoundError', // forbidden
    409: 'HoodieConflictError',
    412: 'HoodieConflictError', // file exist
    500: 'HoodieServerError'
  };

  //
  // public API
  //
  hoodie.request = request;
}

module.exports = hoodieRequest;

},{"../utils/hoodiefy_request_error_name":12,"../utils/promise/reject_with":15,"extend":1}],4:[function(require,module,exports){
// Hoodie Error
// -------------

// With the custom hoodie error function
// we normalize all errors the get returned
// when using hoodie's rejectWith
//
// The native JavaScript error method has
// a name & a message property. HoodieError
// requires these, but on top allows for
// unlimited custom properties.
//
// Instead of being initialized with just
// the message, HoodieError expects an
// object with properites. The `message`
// property is required. The name will
// fallback to `error`.
//
// `message` can also contain placeholders
// in the form of `{{propertyName}}`` which
// will get replaced automatically with passed
// extra properties.
//
// ### Error Conventions
//
// We follow JavaScript's native error conventions,
// meaning that error names are camelCase with the
// first letter uppercase as well, and the message
// starting with an uppercase letter.
//
var errorMessageReplacePattern = /\{\{\s*\w+\s*\}\}/g;
var errorMessageFindPropertyPattern = /\w+/;

var extend = require('extend');

function HoodieError(properties) {

  // normalize arguments
  if (typeof properties === 'string') {
    properties = {
      message: properties
    };
  }

  if (! properties.message) {
    throw new Error('FATAL: error.message must be set');
  }

  // must check for properties, as this.name is always set.
  if (! properties.name) {
    properties.name = 'HoodieError';
  }

  properties.message = properties.message.replace(errorMessageReplacePattern, function(match) {
    var property = match.match(errorMessageFindPropertyPattern)[0];
    return properties[property];
  });
  extend(this, properties);
}
HoodieError.prototype = new Error();
HoodieError.prototype.constructor = HoodieError;

module.exports = HoodieError;


},{"extend":1}],5:[function(require,module,exports){
// Hoodie Invalid Type Or Id Error
// -------------------------------

// only lowercase letters, numbers and dashes
// are allowed for object IDs.
//
var HoodieError = require('./error');

//
function HoodieObjectIdError(properties) {
  properties.name = 'HoodieObjectIdError';
  properties.message = '"{{id}}" is invalid object id. {{rules}}.';

  return new HoodieError(properties);
}
var validIdPattern = /^[a-z0-9\-]+$/;
HoodieObjectIdError.isInvalid = function(id, customPattern) {
  return !(customPattern || validIdPattern).test(id || '');
};
HoodieObjectIdError.isValid = function(id, customPattern) {
  return (customPattern || validIdPattern).test(id || '');
};
HoodieObjectIdError.prototype.rules = 'Lowercase letters, numbers and dashes allowed only. Must start with a letter';

module.exports = HoodieObjectIdError;

},{"./error":4}],6:[function(require,module,exports){
// Hoodie Invalid Type Or Id Error
// -------------------------------

// only lowercase letters, numbers and dashes
// are allowed for object types, plus must start
// with a letter.
//
var HoodieError = require('./error');

// Hoodie Invalid Type Or Id Error
// -------------------------------

// only lowercase letters, numbers and dashes
// are allowed for object types, plus must start
// with a letter.
//
function HoodieObjectTypeError(properties) {
  properties.name = 'HoodieObjectTypeError';
  properties.message = '"{{type}}" is invalid object type. {{rules}}.';

  return new HoodieError(properties);
}
var validTypePattern = /^[a-z$][a-z0-9]+$/;
HoodieObjectTypeError.isInvalid = function(type, customPattern) {
  return !(customPattern || validTypePattern).test(type || '');
};
HoodieObjectTypeError.isValid = function(type, customPattern) {
  return (customPattern || validTypePattern).test(type || '');
};
HoodieObjectTypeError.prototype.rules = 'lowercase letters, numbers and dashes allowed only. Must start with a letter';

module.exports = HoodieObjectTypeError;

},{"./error":4}],7:[function(require,module,exports){
// Events
// ========
//
// extend any Class with support for
//
// * `object.bind('event', cb)`
// * `object.unbind('event', cb)`
// * `object.trigger('event', args...)`
// * `object.one('ev', cb)`
//
// based on [Events implementations from Spine](https://github.com/maccman/spine/blob/master/src/spine.coffee#L1)
//

// callbacks are global, while the events API is used at several places,
// like hoodie.on / hoodie.store.on / hoodie.task.on etc.
//
function hoodieEvents(hoodie, options) {
  var context = hoodie;
  var namespace = '';

  // normalize options hash
  options = options || {};

  // make sure callbacks hash exists
  if (!hoodie.eventsCallbacks) {
    hoodie.eventsCallbacks = {};
  }

  if (options.context) {
    context = options.context;
    namespace = options.namespace + ':';
  }

  // Bind
  // ------
  //
  // bind a callback to an event triggerd by the object
  //
  //     object.bind 'cheat', blame
  //
  function bind(ev, callback) {
    var evs, name, _i, _len;

    evs = ev.split(' ');

    for (_i = 0, _len = evs.length; _i < _len; _i++) {
      name = namespace + evs[_i];
      hoodie.eventsCallbacks[name] = hoodie.eventsCallbacks[name] || [];
      hoodie.eventsCallbacks[name].push(callback);
    }
  }

  // one
  // -----
  //
  // same as `bind`, but does get executed only once
  //
  //     object.one 'groundTouch', gameOver
  //
  function one(ev, callback) {
    ev = namespace + ev;
    var wrapper = function() {
        hoodie.unbind(ev, wrapper);
        callback.apply(null, arguments);
      };
    hoodie.bind(ev, wrapper);
  }

  // trigger
  // ---------
  //
  // trigger an event and pass optional parameters for binding.
  //     object.trigger 'win', score: 1230
  //
  function trigger() {
    var args, callback, ev, list, _i, _len;

    args = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
    ev = args.shift();
    ev = namespace + ev;
    list = hoodie.eventsCallbacks[ev];

    if (!list) {
      return;
    }

    for (_i = 0, _len = list.length; _i < _len; _i++) {
      callback = list[_i];
      callback.apply(null, args);
    }

    return true;
  }

  // unbind
  // --------
  //
  // unbind to from all bindings, from all bindings of a specific event
  // or from a specific binding.
  //
  //     object.unbind()
  //     object.unbind 'move'
  //     object.unbind 'move', follow
  //
  function unbind(ev, callback) {
    var cb, i, list, _i, _len, evNames;

    if (!ev) {
      if (!namespace) {
        hoodie.eventsCallbacks = {};
      }

      evNames = Object.keys(hoodie.eventsCallbacks);
      evNames = evNames.filter(function(key) {
        return key.indexOf(namespace) === 0;
      });
      evNames.forEach(function(key) {
        delete hoodie.eventsCallbacks[key];
      });

      return;
    }

    ev = namespace + ev;

    list = hoodie.eventsCallbacks[ev];

    if (!list) {
      return;
    }

    if (!callback) {
      delete hoodie.eventsCallbacks[ev];
      return;
    }

    for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
      cb = list[i];


      if (cb !== callback) {
        continue;
      }

      list = list.slice();
      list.splice(i, 1);
      hoodie.eventsCallbacks[ev] = list;
      break;
    }

    return;
  }

  context.bind = bind;
  context.on = bind;
  context.one = one;
  context.trigger = trigger;
  context.unbind = unbind;
  context.off = unbind;
}

module.exports = hoodieEvents;

},{}],8:[function(require,module,exports){
// Store
// ============

// This class defines the API that hoodie.store (local store) and hoodie.open
// (remote store) implement to assure a coherent API. It also implements some
// basic validations.
//
// The returned API provides the following methods:
//
// * validate
// * save
// * add
// * find
// * findOrAdd
// * findAll
// * update
// * updateAll
// * remove
// * removeAll
// * decoratePromises
// * trigger
// * on
// * unbind
//
// At the same time, the returned API can be called as function returning a
// store scoped by the passed type, for example
//
//     var taskStore = hoodie.store('task');
//     taskStore.findAll().then( showAllTasks );
//     taskStore.update('id123', {done: true});
//

//
var hoodieScopedStoreApi = require('./scoped');
var hoodieEvents = require('../events');
var HoodieError = require('../error/error');
var HoodieObjectTypeError = require('../error/object_type');
var HoodieObjectIdError = require('../error/object_id');
var extend = require('extend');

var getDefer = require('../../utils/promise/defer');
var rejectWith = require('../../utils/promise/reject_with');
var resolveWith = require('../../utils/promise/resolve_with');
var isPromise = require('../../utils/promise/is_promise');

//
function hoodieStoreApi(hoodie, options) {

  // persistance logic
  var backend = {};

  // extend this property with extra functions that will be available
  // on all promises returned by hoodie.store API. It has a reference
  // to current hoodie instance by default
  var promiseApi = {
    hoodie: hoodie
  };

  // name
  var storeName = options.name || 'store';

  // public API
  var api = function api(type, id) {
    var scopedOptions = extend(true, {
      type: type,
      id: id
    }, options);
    return hoodieScopedStoreApi(hoodie, api, scopedOptions);
  };

  // add event API
  hoodieEvents(hoodie, {
    context: api,
    namespace: storeName
  });


  // Validate
  // --------------

  // by default, we only check for a valid type & id.
  // the validate method can be overwriten by passing
  // options.validate
  //
  // if `validate` returns nothing, the passed object is
  // valid. Otherwise it returns an error
  //
  api.validate = options.validate;

  if (!options.validate) {
    api.validate = function(object /*, options */ ) {

      if (!object) {
        return new HoodieError({
          name: 'InvalidObjectError',
          message: 'No object passed.'
        });
      }

      if (HoodieObjectTypeError.isInvalid(object.type, validIdOrTypePattern)) {
        return new HoodieObjectTypeError({
          type: object.type,
          rules: validIdOrTypeRules
        });
      }

      if (!object.id) {
        return;
      }

      if (HoodieObjectIdError.isInvalid(object.id, validIdOrTypePattern)) {
        return new HoodieObjectIdError({
          id: object.id,
          rules: validIdOrTypeRules
        });
      }

    };

  }

  // Save
  // --------------

  // creates or replaces an an eventually existing object in the store
  // with same type & id.
  //
  // When id is undefined, it gets generated and a new object gets saved
  //
  // example usage:
  //
  //     store.save('car', undefined, {color: 'red'})
  //     store.save('car', 'abc4567', {color: 'red'})
  //
  api.save = function save(type, id, properties, options) {

    if (options) {
      options = extend(true, {}, options);
    } else {
      options = {};
    }

    // don't mess with passed object
    var object = extend(true, {}, properties, {
      type: type,
      id: id
    });

    // validations
    var error = api.validate(object, options || {});

    if (error) {
      return rejectWith(error);
    }

    return decoratePromise(backend.save(object, options || {}));
  };


  // Add
  // -------------------

  // `.add` is an alias for `.save`, with the difference that there is no id argument.
  // Internally it simply calls `.save(type, undefined, object).
  //
  api.add = function add(type, properties, options) {

    if (properties === undefined) {
      properties = {};
    }

    options = options || {};

    return api.save(type, properties.id, properties, options);
  };


  // find
  // ------

  //
  api.find = function find(type, id) {

    return decoratePromise(backend.find(type, id));
  };


  // find or add
  // -------------

  // 1. Try to find a share by given id
  // 2. If share could be found, return it
  // 3. If not, add one and return it.
  //
  api.findOrAdd = function findOrAdd(type, id, properties) {

    if (properties === null) {
      properties = {};
    }

    function handleNotFound() {
      var newProperties;
      newProperties = extend(true, {
        id: id
      }, properties);
      return api.add(type, newProperties);
    }

    // promise decorations get lost when piped through `then`,
    // that's why we need to decorate the find's promise again.
    var promise = api.find(type, id).then(null, handleNotFound);
    return decoratePromise(promise);
  };


  // findAll
  // ------------

  // returns all objects from store.
  // Can be optionally filtered by a type or a function
  //
  api.findAll = function findAll(type, options) {
    return decoratePromise( backend.findAll(type, options) );
  };


  // Update
  // -------------------

  // In contrast to `.save`, the `.update` method does not replace the stored object,
  // but only changes the passed attributes of an exsting object, if it exists
  //
  // both a hash of key/values or a function that applies the update to the passed
  // object can be passed.
  //
  // example usage
  //
  // hoodie.store.update('car', 'abc4567', {sold: true})
  // hoodie.store.update('car', 'abc4567', function(obj) { obj.sold = true })
  //
  api.update = function update(type, id, objectUpdate, options) {

    function handleFound(currentObject) {
      var changedProperties, newObj, value;

      // normalize input
      newObj = extend(true, {}, currentObject);

      if (typeof objectUpdate === 'function') {
        objectUpdate = objectUpdate(newObj);
      }

      if (!objectUpdate) {
        return resolveWith(currentObject);
      }

      // check if something changed
      changedProperties = (function() {
        var _results = [];

        for (var key in objectUpdate) {
          if (objectUpdate.hasOwnProperty(key)) {
            value = objectUpdate[key];
            if ((currentObject[key] !== value) === false) {
              continue;
            }
            // workaround for undefined values, as extend ignores these
            newObj[key] = value;
            _results.push(key);
          }
        }
        return _results;
      })();

      if (!(changedProperties.length || options)) {
        return resolveWith(newObj);
      }

      //apply update
      return api.save(type, id, newObj, options);
    }

    // promise decorations get lost when piped through `then`,
    // that's why we need to decorate the find's promise again.
    var promise = api.find(type, id).then(handleFound);
    return decoratePromise(promise);
  };


  // updateOrAdd
  // -------------

  // same as `.update()`, but in case the object cannot be found,
  // it gets created
  //
  api.updateOrAdd = function updateOrAdd(type, id, objectUpdate, options) {
    function handleNotFound() {
      var properties = extend(true, {}, objectUpdate, {
        id: id
      });

      return api.add(type, properties, options);
    }

    var promise = api.update(type, id, objectUpdate, options).then(null, handleNotFound);

    return decoratePromise(promise);
  };


  // updateAll
  // -----------------

  // update all objects in the store, can be optionally filtered by a function
  // As an alternative, an array of objects can be passed
  //
  // example usage
  //
  // hoodie.store.updateAll()
  //
  api.updateAll = function updateAll(filterOrObjects, objectUpdate, options) {
    var promise;

    options = options || {};

    // normalize the input: make sure we have all objects
    switch (true) {
    case typeof filterOrObjects === 'string':
      promise = api.findAll(filterOrObjects);
      break;
    case isPromise(filterOrObjects):
      promise = filterOrObjects;
      break;
    case $.isArray(filterOrObjects):
      promise = getDefer().resolve(filterOrObjects).promise();
      break;
    default:
      // e.g. null, update all
      promise = api.findAll();
    }

    promise = promise.then(function(objects) {
      // now we update all objects one by one and return a promise
      // that will be resolved once all updates have been finished
      var object, _updatePromises;

      if (!$.isArray(objects)) {
        objects = [objects];
      }

      _updatePromises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(api.update(object.type, object.id, objectUpdate, options));
        }
        return _results;
      })();

      return $.when.apply(null, _updatePromises);
    });

    return decoratePromise(promise);
  };


  // Remove
  // ------------

  // Removes one object specified by `type` and `id`.
  //
  // when object has been synced before, mark it as deleted.
  // Otherwise remove it from Store.
  //
  api.remove = function remove(type, id, options) {
    return decoratePromise(backend.remove(type, id, options || {}));
  };


  // removeAll
  // -----------

  // Destroye all objects. Can be filtered by a type
  //
  api.removeAll = function removeAll(type, options) {
    return decoratePromise(backend.removeAll(type, options || {}));
  };


  // decorate promises
  // -------------------

  // extend promises returned by store.api
  api.decoratePromises = function decoratePromises(methods) {
    return extend(promiseApi, methods);
  };



  // required backend methods
  // -------------------------
  if (!options.backend) {
    throw new Error('options.backend must be passed');
  }

  var required = 'save find findAll remove removeAll'.split(' ');

  required.forEach(function(methodName) {

    if (!options.backend[methodName]) {
      throw new Error('options.backend.' + methodName + ' must be passed.');
    }

    backend[methodName] = options.backend[methodName];
  });


  // Private
  // ---------

  // / not allowed for id
  var validIdOrTypePattern = /^[^\/]+$/;
  var validIdOrTypeRules = '/ not allowed';

  //
  function decoratePromise(promise) {
    return extend(promise, promiseApi);
  }

  return api;
}

module.exports = hoodieStoreApi;

},{"../../utils/promise/defer":13,"../../utils/promise/is_promise":14,"../../utils/promise/reject_with":15,"../../utils/promise/resolve_with":16,"../error/error":4,"../error/object_id":5,"../error/object_type":6,"../events":7,"./scoped":10,"extend":1}],9:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Remote
// ========

// Connection to a remote Couch Database.
//
// store API
// ----------------
//
// object loading / updating / deleting
//
// * find(type, id)
// * findAll(type )
// * add(type, object)
// * save(type, id, object)
// * update(type, id, new_properties )
// * updateAll( type, new_properties)
// * remove(type, id)
// * removeAll(type)
//
// custom requests
//
// * request(view, params)
// * get(view, params)
// * post(view, params)
//
// synchronization
//
// * connect()
// * disconnect()
// * pull()
// * push()
// * sync()
//
// event binding
//
// * on(event, callback)
//

var hoodieStoreApi = require('./api');
var extend = require('extend');
var generateId = require('../../utils/generate_id');
var resolveWith = require('../../utils/promise/resolve_with');

//
function hoodieRemoteStore(hoodie, options) {

  var remoteStore = {};


  // Remote Store Persistance methods
  // ----------------------------------

  // find
  // ------

  // find one object
  //
  remoteStore.find = function find(type, id) {
    var path;

    path = type + '/' + id;

    if (remote.prefix) {
      path = remote.prefix + path;
    }

    path = '/' + encodeURIComponent(path);

    return remote.request('GET', path).then(parseFromRemote);
  };


  // findAll
  // ---------

  // find all objects, can be filetered by a type
  //
  remoteStore.findAll = function findAll(type) {
    var endkey, path, startkey;

    path = '/_all_docs?include_docs=true';

    switch (true) {
    case (type !== undefined) && remote.prefix !== '':
      startkey = remote.prefix + type + '/';
      break;
    case type !== undefined:
      startkey = type + '/';
      break;
    case remote.prefix !== '':
      startkey = remote.prefix;
      break;
    default:
      startkey = '';
    }

    if (startkey) {

      // make sure that only objects starting with
      // `startkey` will be returned
      endkey = startkey.replace(/.$/, function(chars) {
        var charCode;
        charCode = chars.charCodeAt(0);
        return String.fromCharCode(charCode + 1);
      });
      path = '' + path + '&startkey="' + (encodeURIComponent(startkey)) + '"&endkey="' + (encodeURIComponent(endkey)) + '"';
    }

    return remote.request('GET', path).then(mapDocsFromFindAll).then(parseAllFromRemote);
  };


  // save
  // ------

  // save a new object. If it existed before, all properties
  // will be overwritten
  //
  remoteStore.save = function save(object) {
    var path;

    if (!object.id) {
      object.id = generateId();
    }

    object = parseForRemote(object);
    path = '/' + encodeURIComponent(object._id);
    return remote.request('PUT', path, {
      data: object
    });
  };


  // remove
  // ---------

  // remove one object
  //
  remoteStore.remove = function remove(type, id) {
    return remote.update(type, id, {
      _deleted: true
    });
  };


  // removeAll
  // ------------

  // remove all objects, can be filtered by type
  //
  remoteStore.removeAll = function removeAll(type) {
    return remote.updateAll(type, {
      _deleted: true
    });
  };


  var remote = hoodieStoreApi(hoodie, {

    name: options.name,

    backend: {
      save: remoteStore.save,
      find: remoteStore.find,
      findAll: remoteStore.findAll,
      remove: remoteStore.remove,
      removeAll: remoteStore.removeAll
    }
  });





  // properties
  // ------------

  // name

  // the name of the Remote is the name of the
  // CouchDB database and is also used to prefix
  // triggered events
  //
  var remoteName = null;


  // sync

  // if set to true, updates will be continuously pulled
  // and pushed. Alternatively, `sync` can be set to
  // `pull: true` or `push: true`.
  //
  remote.connected = false;


  // prefix

  // prefix for docs in a CouchDB database, e.g. all docs
  // in public user stores are prefixed by '$public/'
  //
  remote.prefix = '';
  var remotePrefixPattern = new RegExp('^');


  // defaults
  // ----------------

  //
  if (options.name !== undefined) {
    remoteName = options.name;
  }

  if (options.prefix !== undefined) {
    remote.prefix = options.prefix;
    remotePrefixPattern = new RegExp('^' + remote.prefix);
  }

  if (options.baseUrl !== null) {
    remote.baseUrl = options.baseUrl;
  }


  // request
  // ---------

  // wrapper for hoodie's request, with some store specific defaults
  // and a prefixed path
  //
  remote.request = function remoteRequest(type, path, options) {
    options = options || {};

    if (remoteName) {
      path = '/' + (encodeURIComponent(remoteName)) + path;
    }

    if (remote.baseUrl) {
      path = '' + remote.baseUrl + path;
    }

    options.contentType = options.contentType || 'application/json';

    if (type === 'POST' || type === 'PUT') {
      options.dataType = options.dataType || 'json';
      options.processData = options.processData || false;
      options.data = JSON.stringify(options.data);
    }
    return hoodie.request(type, path, options);
  };


  // isKnownObject
  // ---------------

  // determine between a known and a new object
  //
  remote.isKnownObject = function isKnownObject(object) {
    var key = '' + object.type + '/' + object.id;

    if (knownObjects[key] !== undefined) {
      return knownObjects[key];
    }
  };


  // markAsKnownObject
  // -------------------

  // determine between a known and a new object
  //
  remote.markAsKnownObject = function markAsKnownObject(object) {
    var key = '' + object.type + '/' + object.id;
    knownObjects[key] = 1;
    return knownObjects[key];
  };


  // synchronization
  // -----------------

  // Connect
  // ---------

  // start syncing. `remote.bootstrap()` will automatically start
  // pulling when `remote.connected` remains true.
  //
  remote.connect = function connect(name) {
    if (name) {
      remoteName = name;
    }
    remote.connected = true;
    remote.trigger('connect');
    return remote.bootstrap().then(function() {
      remote.push();
    });
  };


  // Disconnect
  // ------------

  // stop syncing changes from remote store
  //
  remote.disconnect = function disconnect() {
    remote.connected = false;
    remote.trigger('disconnect'); // TODO: spec that
    if (pullRequest) {
      pullRequest.abort();
    }

    if (pushRequest) {
      pushRequest.abort();
    }

  };


  // isConnected
  // -------------

  //
  remote.isConnected = function isConnected() {
    return remote.connected;
  };


  // getSinceNr
  // ------------

  // returns the sequence number from wich to start to find changes in pull
  //
  var since = options.since || 0; // TODO: spec that!
  remote.getSinceNr = function getSinceNr() {
    if (typeof since === 'function') {
      return since();
    }

    return since;
  };


  // bootstrap
  // -----------

  // inital pull of data of the remote store. By default, we pull all
  // changes since the beginning, but this behavior might be adjusted,
  // e.g for a filtered bootstrap.
  //
  var isBootstrapping = false;
  remote.bootstrap = function bootstrap() {
    isBootstrapping = true;
    remote.trigger('bootstrap:start');
    return remote.pull().done(handleBootstrapSuccess).fail(handleBootstrapError);
  };


  // pull changes
  // --------------

  // a.k.a. make a GET request to CouchDB's `_changes` feed.
  // We currently make long poll requests, that we manually abort
  // and restart each 25 seconds.
  //
  var pullRequest, pullRequestTimeout;
  remote.pull = function pull() {
    pullRequest = remote.request('GET', pullUrl());

    if (remote.isConnected()) {
      global.clearTimeout(pullRequestTimeout);
      pullRequestTimeout = global.setTimeout(restartPullRequest, 25000);
    }

    return pullRequest.done(handlePullSuccess).fail(handlePullError);
  };


  // push changes
  // --------------

  // Push objects to remote store using the `_bulk_docs` API.
  //
  var pushRequest;
  remote.push = function push(objects) {
    var object, objectsForRemote, _i, _len;

    if (!$.isArray(objects)) {
      objects = defaultObjectsToPush();
    }

    if (objects.length === 0) {
      return resolveWith([]);
    }

    objectsForRemote = [];

    for (_i = 0, _len = objects.length; _i < _len; _i++) {

      // don't mess with original objects
      object = extend(true, {}, objects[_i]);
      addRevisionTo(object);
      object = parseForRemote(object);
      objectsForRemote.push(object);
    }
    pushRequest = remote.request('POST', '/_bulk_docs', {
      data: {
        docs: objectsForRemote,
        new_edits: false
      }
    });

    pushRequest.done(function() {
      for (var i = 0; i < objects.length; i++) {
        remote.trigger('push', objects[i]);
      }
    });
    return pushRequest;
  };

  // sync changes
  // --------------

  // push objects, then pull updates.
  //
  remote.sync = function sync(objects) {
    return remote.push(objects).then(remote.pull);
  };

  //
  // Private
  // ---------
  //

  // in order to differentiate whether an object from remote should trigger a 'new'
  // or an 'update' event, we store a hash of known objects
  var knownObjects = {};


  // valid CouchDB doc attributes starting with an underscore
  //
  var validSpecialAttributes = ['_id', '_rev', '_deleted', '_revisions', '_attachments'];


  // default objects to push
  // --------------------------

  // when pushed without passing any objects, the objects returned from
  // this method will be passed. It can be overwritten by passing an
  // array of objects or a function as `options.objects`
  //
  var defaultObjectsToPush = function defaultObjectsToPush() {
      return [];
    };
  if (options.defaultObjectsToPush) {
    if ($.isArray(options.defaultObjectsToPush)) {
      defaultObjectsToPush = function defaultObjectsToPush() {
        return options.defaultObjectsToPush;
      };
    } else {
      defaultObjectsToPush = options.defaultObjectsToPush;
    }
  }


  // setSinceNr
  // ------------

  // sets the sequence number from wich to start to find changes in pull.
  // If remote store was initialized with since : function(nr) { ... },
  // call the function with the seq passed. Otherwise simply set the seq
  // number and return it.
  //
  function setSinceNr(seq) {
    if (typeof since === 'function') {
      return since(seq);
    }

    since = seq;
    return since;
  }


  // Parse for remote
  // ------------------

  // parse object for remote storage. All properties starting with an
  // `underscore` do not get synchronized despite the special properties
  // `_id`, `_rev` and `_deleted` (see above)
  //
  // Also `id` gets replaced with `_id` which consists of type & id
  //
  function parseForRemote(object) {
    var attr, properties;
    properties = extend({}, object);

    for (attr in properties) {
      if (properties.hasOwnProperty(attr)) {
        if (validSpecialAttributes.indexOf(attr) !== -1) {
          continue;
        }
        if (!/^_/.test(attr)) {
          continue;
        }
        delete properties[attr];
      }
    }

    // prepare CouchDB id
    properties._id = '' + properties.type + '/' + properties.id;
    if (remote.prefix) {
      properties._id = '' + remote.prefix + properties._id;
    }
    delete properties.id;
    return properties;
  }


  // ### parseFromRemote

  // normalize objects coming from remote
  //
  // renames `_id` attribute to `id` and removes the type from the id,
  // e.g. `type/123` -> `123`
  //
  function parseFromRemote(object) {
    var id, matches;

    // handle id and type
    id = object._id || object.id;
    delete object._id;

    if (remote.prefix) {
      id = id.replace(remotePrefixPattern, '');
    }

    // turn doc/123 into type = doc & id = 123
    // NOTE: we don't use a simple id.split(/\//) here,
    // as in some cases IDs might contain '/', too
    //
    matches = id.match(/([^\/]+)\/(.*)/);
    object.type = matches[1], object.id = matches[2];

    return object;
  }

  function parseAllFromRemote(objects) {
    return objects.map(parseFromRemote);
  }


  // ### _addRevisionTo

  // extends passed object with a _rev property
  //
  function addRevisionTo(attributes) {
    var currentRevId, currentRevNr, newRevisionId, parts;
    try {
      parts = attributes._rev.split(/-/), currentRevNr = parts[0], currentRevId = parts[1];
    } catch (_error) {}
    currentRevNr = parseInt(currentRevNr, 10) || 0;
    newRevisionId = generateNewRevisionId();

    // local changes are not meant to be replicated outside of the
    // users database, therefore the `-local` suffix.
    if (attributes._$local) {
      newRevisionId += '-local';
    }

    attributes._rev = '' + (currentRevNr + 1) + '-' + newRevisionId;
    attributes._revisions = {
      start: 1,
      ids: [newRevisionId]
    };

    if (currentRevId) {
      attributes._revisions.start += currentRevNr;
      return attributes._revisions.ids.push(currentRevId);
    }
  }


  // ### generate new revision id

  //
  function generateNewRevisionId() {
    return generateId(9);
  }


  // ### map docs from findAll

  //
  function mapDocsFromFindAll(response) {
    return response.rows.map(function(row) {
      return row.doc;
    });
  }


  // ### pull url

  // Depending on whether remote is connected (= pulling changes continuously)
  // return a longpoll URL or not. If it is a beginning bootstrap request, do
  // not return a longpoll URL, as we want it to finish right away, even if there
  // are no changes on remote.
  //
  function pullUrl() {
    var since;
    since = remote.getSinceNr();
    if (remote.isConnected() && !isBootstrapping) {
      return '/_changes?include_docs=true&since=' + since + '&heartbeat=10000&feed=longpoll';
    } else {
      return '/_changes?include_docs=true&since=' + since;
    }
  }


  // ### restart pull request

  // request gets restarted automaticcally
  // when aborted (see handlePullError)
  function restartPullRequest() {
    if (pullRequest) {
      pullRequest.abort();
    }
  }


  // ### pull success handler

  // request gets restarted automaticcally
  // when aborted (see handlePullError)
  //
  function handlePullSuccess(response) {
    setSinceNr(response.last_seq);
    handlePullResults(response.results);
    if (remote.isConnected()) {
      return remote.pull();
    }
  }


  // ### pull error handler

  // when there is a change, trigger event,
  // then check for another change
  //
  function handlePullError(xhr, error) {
    if (!remote.isConnected()) {
      return;
    }

    switch (xhr.status) {
      // Session is invalid. User is still login, but needs to reauthenticate
      // before sync can be continued
    case 401:
      remote.trigger('error:unauthenticated', error);
      return remote.disconnect();

      // the 404 comes, when the requested DB has been removed
      // or does not exist yet.
      //
      // BUT: it might also happen that the background workers did
      //      not create a pending database yet. Therefore,
      //      we try it again in 3 seconds
      //
      // TODO: review / rethink that.
      //
    case 404:
      return global.setTimeout(remote.pull, 3000);

    case 500:
      //
      // Please server, don't give us these. At least not persistently
      //
      remote.trigger('error:server', error);
      global.setTimeout(remote.pull, 3000);
      return hoodie.checkConnection();
    default:
      // usually a 0, which stands for timeout or server not reachable.
      if (xhr.statusText === 'abort') {
        // manual abort after 25sec. restart pulling changes directly when connected
        return remote.pull();
      } else {

        // oops. This might be caused by an unreachable server.
        // Or the server cancelled it for what ever reason, e.g.
        // heroku kills the request after ~30s.
        // we'll try again after a 3s timeout
        //
        global.setTimeout(remote.pull, 3000);
        return hoodie.checkConnection();
      }
    }
  }


  // ### handle initial bootstrapping from remote
  //
  function handleBootstrapSuccess() {
    isBootstrapping = false;
    remote.trigger('bootstrap:end');
  }

  // ### handle error of initial bootstrapping from remote
  //
  function handleBootstrapError(error) {
    isBootstrapping = false;
    remote.trigger('bootstrap:error', error);
  }

  // ### handle changes from remote
  //
  function handlePullResults(changes) {
    var doc, event, object, _i, _len;

    for (_i = 0, _len = changes.length; _i < _len; _i++) {
      doc = changes[_i].doc;

      if (remote.prefix && doc._id.indexOf(remote.prefix) !== 0) {
        continue;
      }

      object = parseFromRemote(doc);

      if (object._deleted) {
        if (!remote.isKnownObject(object)) {
          continue;
        }
        event = 'remove';
        remote.isKnownObject(object);
      } else {
        if (remote.isKnownObject(object)) {
          event = 'update';
        } else {
          event = 'add';
          remote.markAsKnownObject(object);
        }
      }

      remote.trigger(event, object);
      remote.trigger(event + ':' + object.type, object);
      remote.trigger(event + ':' + object.type + ':' + object.id, object);
      remote.trigger('change', event, object);
      remote.trigger('change:' + object.type, event, object);
      remote.trigger('change:' + object.type + ':' + object.id, event, object);
    }
  }


  // bootstrap known objects
  //
  if (options.knownObjects) {
    for (var i = 0; i < options.knownObjects.length; i++) {
      remote.markAsKnownObject({
        type: options.knownObjects[i].type,
        id: options.knownObjects[i].id
      });
    }
  }


  // expose public API
  return remote;
}

module.exports = hoodieRemoteStore;

},{"../../utils/generate_id":11,"../../utils/promise/resolve_with":16,"./api":8,"extend":1}],10:[function(require,module,exports){
// scoped Store
// ============

// same as store, but with type preset to an initially
// passed value.
//
var hoodieEvents = require('../events');

//
function hoodieScopedStoreApi(hoodie, storeApi, options) {

  // name
  var storeName = options.name || 'store';
  var type = options.type;
  var id = options.id;

  var api = {};

  // scoped by type only
  if (!id) {

    // add events
    hoodieEvents(hoodie, {
      context: api,
      namespace: storeName + ':' + type
    });

    //
    api.save = function save(id, properties, options) {
      return storeApi.save(type, id, properties, options);
    };

    //
    api.add = function add(properties, options) {
      return storeApi.add(type, properties, options);
    };

    //
    api.find = function find(id) {
      return storeApi.find(type, id);
    };

    //
    api.findOrAdd = function findOrAdd(id, properties) {
      return storeApi.findOrAdd(type, id, properties);
    };

    //
    api.findAll = function findAll(options) {
      return storeApi.findAll(type, options);
    };

    //
    api.update = function update(id, objectUpdate, options) {
      return storeApi.update(type, id, objectUpdate, options);
    };

    //
    api.updateAll = function updateAll(objectUpdate, options) {
      return storeApi.updateAll(type, objectUpdate, options);
    };

    //
    api.remove = function remove(id, options) {
      return storeApi.remove(type, id, options);
    };

    //
    api.removeAll = function removeAll(options) {
      return storeApi.removeAll(type, options);
    };
  }

  // scoped by both: type & id
  if (id) {

    // add events
    hoodieEvents(hoodie, {
      context: api,
      namespace: storeName + ':' + type + ':' + id
    });

    //
    api.save = function save(properties, options) {
      return storeApi.save(type, id, properties, options);
    };

    //
    api.find = function find() {
      return storeApi.find(type, id);
    };

    //
    api.update = function update(objectUpdate, options) {
      return storeApi.update(type, id, objectUpdate, options);
    };

    //
    api.remove = function remove(options) {
      return storeApi.remove(type, id, options);
    };
  }

  //
  api.decoratePromises = storeApi.decoratePromises;
  api.validate = storeApi.validate;

  return api;
}

module.exports = hoodieScopedStoreApi;

},{"../events":7}],11:[function(require,module,exports){
var chars, i, radix;

// uuids consist of numbers and lowercase letters only.
// We stick to lowercase letters to prevent confusion
// and to prevent issues with CouchDB, e.g. database
// names do wonly allow for lowercase letters.
chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
radix = chars.length;

// helper to generate unique ids.
function generateId (length) {
  var id = '';

  // default uuid length to 7
  if (length === undefined) {
    length = 7;
  }

  for (i = 0; i < length; i++) {
    var rand = Math.random() * radix;
    var char = chars[Math.floor(rand)];
    id += String(char).charAt(0);
  }

  return id;
}

module.exports = generateId;

},{}],12:[function(require,module,exports){
var findLettersToUpperCase = /(^\w|_\w)/g;

function hoodiefyRequestErrorName (name) {
  name = name.replace(findLettersToUpperCase, function (match) {
    return (match[1] || match[0]).toUpperCase();
  });

  return 'Hoodie' + name + 'Error';
}

module.exports = hoodiefyRequestErrorName;
},{}],13:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};module.exports = global.jQuery.Deferred;
},{}],14:[function(require,module,exports){
// returns true if passed object is a promise (but not a deferred),
// otherwise false.
function isPromise(object) {
  return !! (object &&
             typeof object.done === 'function' &&
             typeof object.resolve !== 'function');
}

module.exports = isPromise;
},{}],15:[function(require,module,exports){
var getDefer = require('./defer');
var HoodieError = require('../../lib/error/error');

//
function rejectWith(errorProperties) {
  var error = new HoodieError(errorProperties);
  return getDefer().reject(error).promise();
}

module.exports = rejectWith;

},{"../../lib/error/error":4,"./defer":13}],16:[function(require,module,exports){
var getDefer = require('./defer');

//
function resolveWith() {
  var defer = getDefer();
  return defer.resolve.apply(defer, arguments).promise();
}

module.exports = resolveWith;

},{"./defer":13}],17:[function(require,module,exports){
// Hoodie Admin
// -------------
//
// your friendly library for pocket,
// the Hoodie Admin UI
//
var hoodieRequest = require('hoodie/src/hoodie/request');
var hoodieOpen = require('hoodie/src/hoodie/open');

var hoodieAdminAccount = require('./hoodie.admin/account');
var hoodieAdminPlugin = require('./hoodie.admin/plugin');
var hoodieAdminUser = require('./hoodie.admin/user');

var hoodieEvents = require('hoodie/src/lib/events');

// Constructor
// -------------

// When initializing a hoodie instance, an optional URL
// can be passed. That's the URL of the hoodie backend.
// If no URL passed it defaults to the current domain.
//
//     // init a new hoodie instance
//     hoodie = new Hoodie
//
function HoodieAdmin(baseUrl) {
  var hoodieAdmin = this;

  // enforce initialization with `new`
  if (!(hoodieAdmin instanceof HoodieAdmin)) {
    throw new Error('usage: new HoodieAdmin(url);');
  }

  // remove trailing slashes
  hoodieAdmin.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';


  // hoodieAdmin.extend
  // ---------------

  // extend hoodieAdmin instance:
  //
  //     hoodieAdmin.extend(function(hoodieAdmin) {} )
  //
  hoodieAdmin.extend = function extend(extension) {
    extension(hoodieAdmin);
  };

  //
  // Extending hoodie admin core
  //

  // * hoodieAdmin.bind
  // * hoodieAdmin.on
  // * hoodieAdmin.one
  // * hoodieAdmin.trigger
  // * hoodieAdmin.unbind
  // * hoodieAdmin.off
  hoodieAdmin.extend(hoodieEvents);

  // * hoodieAdmin.request
  hoodieAdmin.extend(hoodieRequest);

  // * hoodieAdmin.open
  hoodieAdmin.extend(hoodieOpen);

  // * hoodieAdmin.account
  hoodieAdmin.extend(hoodieAdminAccount);

  // * hoodieAdmin.plugin
  hoodieAdmin.extend(hoodieAdminPlugin);

  // * hoodieAdmin.user
  hoodieAdmin.extend(hoodieAdminUser);

  //
  // loading user extensions
  //
  applyExtensions(HoodieAdmin);
}

// Extending HoodieAdmin
// ----------------------

// You can extend the Hoodie class like so:
//
// Hoodie.extend(funcion(HoodieAdmin) { HoodieAdmin.myMagic = function() {} })
//

var extensions = [];

HoodieAdmin.extend = function(extension) {
  extensions.push(extension);
};

//
// detect available extensions and attach to Hoodie Object.
//
function applyExtensions(hoodie) {
  for (var i = 0; i < extensions.length; i++) {
    extensions[i](hoodie);
  }
}

module.exports = HoodieAdmin;

},{"./hoodie.admin/account":18,"./hoodie.admin/plugin":19,"./hoodie.admin/user":20,"hoodie/src/hoodie/open":2,"hoodie/src/hoodie/request":3,"hoodie/src/lib/events":7}],18:[function(require,module,exports){
// HoodieAdmin Account
// ===================

var hoodieEvents = require('hoodie/src/lib/events');

var ADMIN_USERNAME = 'admin';

function hoodieAccount (hoodieAdmin) {

  // public API
  var account = {};
  var signedIn = null;

  // add events API
  hoodieEvents(hoodieAdmin, {
    context: account,
    namespace: 'account'
  });


  // sign in with password
  // ----------------------------------

  // username is hardcoded to "admin"
  account.signIn = function signIn(password) {
    var requestOptions = {
      data: {
        name: ADMIN_USERNAME,
        password: password
      }
    };

    return hoodieAdmin.request('POST', '/_session', requestOptions)
    .done( function() {
      signedIn = true;
      account.trigger('signin', ADMIN_USERNAME);
    });
  };


  // sign out
  // ---------
  account.signOut = function signOut() {
    return hoodieAdmin.request('DELETE', '/_session')
    .done( function() {
      signedIn = false;
      return hoodieAdmin.trigger('signout');
    });
  };

  account.hasValidSession = function() {
    return !!signedIn;
  };

  account.hasInValidSession = function() {
    return !!signedIn;
  };

  hoodieAdmin.account = account;
}

module.exports = hoodieAccount;


},{"hoodie/src/lib/events":7}],19:[function(require,module,exports){
function hoodieAdminPlugin(hoodieAdmin) {
  hoodieAdmin.plugins = hoodieAdmin.open('plugins');
  hoodieAdmin.plugins.connect();
}

module.exports = hoodieAdminPlugin;


},{}],20:[function(require,module,exports){
function hoodieAdminUser(hoodieAdmin) {
  hoodieAdmin.user = hoodieAdmin.open('_users', {
    prefix: 'org.couchdb.user:'
  });
}

module.exports = hoodieAdminUser;


},{}]},{},[17])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9vcGVuLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvcmVxdWVzdC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvbGliL2Vycm9yL2Vycm9yLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9saWIvZXJyb3Ivb2JqZWN0X2lkLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9saWIvZXJyb3Ivb2JqZWN0X3R5cGUuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2xpYi9zdG9yZS9hcGkuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2xpYi9zdG9yZS9yZW1vdGUuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2xpYi9zdG9yZS9zY29wZWQuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL3V0aWxzL2dlbmVyYXRlX2lkLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy91dGlscy9ob29kaWVmeV9yZXF1ZXN0X2Vycm9yX25hbWUuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL3V0aWxzL3Byb21pc2UvZGVmZXIuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL3V0aWxzL3Byb21pc2UvaXNfcHJvbWlzZS5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvdXRpbHMvcHJvbWlzZS9yZWplY3Rfd2l0aC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvdXRpbHMvcHJvbWlzZS9yZXNvbHZlX3dpdGguanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4uanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4vYWNjb3VudC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvc3JjL2hvb2RpZS5hZG1pbi9wbHVnaW4uanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4vdXNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScgfHwgb2JqLm5vZGVUeXBlIHx8IG9iai5zZXRJbnRlcnZhbClcblx0XHRyZXR1cm4gZmFsc2U7XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZClcblx0XHRyZXR1cm4gZmFsc2U7XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKCBrZXkgaW4gb2JqICkge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwoIG9iaiwga2V5ICk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHQgICAgdGFyZ2V0ID0gYXJndW1lbnRzWzBdIHx8IHt9LFxuXHQgICAgaSA9IDEsXG5cdCAgICBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKCB0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkgKSApIHtcblx0XHRcdFx0XHRpZiAoIGNvcHlJc0FycmF5ICkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0gZXh0ZW5kKCBkZWVwLCBjbG9uZSwgY29weSApO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmICggY29weSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuIiwiLy8gT3BlbiBzdG9yZXNcbi8vIC0tLS0tLS0tLS0tLS1cblxudmFyIGhvb2RpZVJlbW90ZVN0b3JlID0gcmVxdWlyZSgnLi4vbGliL3N0b3JlL3JlbW90ZScpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpO1xuXG5mdW5jdGlvbiBob29kaWVPcGVuKGhvb2RpZSkge1xuXG4gIC8vIGdlbmVyaWMgbWV0aG9kIHRvIG9wZW4gYSBzdG9yZS5cbiAgLy9cbiAgLy8gICAgIGhvb2RpZS5vcGVuKFwic29tZV9zdG9yZV9uYW1lXCIpLmZpbmRBbGwoKVxuICAvL1xuICBmdW5jdGlvbiBvcGVuKHN0b3JlTmFtZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgIG5hbWU6IHN0b3JlTmFtZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGhvb2RpZVJlbW90ZVN0b3JlKGhvb2RpZSwgb3B0aW9ucyk7XG4gIH1cblxuICAvL1xuICAvLyBQdWJsaWMgQVBJXG4gIC8vXG4gIGhvb2RpZS5vcGVuID0gb3Blbjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVPcGVuO1xuIiwiLy9cbi8vIGhvb2RpZS5yZXF1ZXN0XG4vLyA9PT09PT09PT09PT09PT09XG5cbi8vIEhvb2RpZSdzIGNlbnRyYWwgcGxhY2UgdG8gc2VuZCByZXF1ZXN0IHRvIGl0cyBiYWNrZW5kLlxuLy8gQXQgdGhlIG1vbWVudCwgaXQncyBhIHdyYXBwZXIgYXJvdW5kIGpRdWVyeSdzIGFqYXggbWV0aG9kLFxuLy8gYnV0IHdlIG1pZ2h0IGdldCByaWQgb2YgdGhpcyBkZXBlbmRlbmN5IGluIHRoZSBmdXR1cmUuXG4vL1xuLy8gSXQgaGFzIGJ1aWxkIGluIHN1cHBvcnQgZm9yIENPUlMgYW5kIGEgc3RhbmRhcmQgZXJyb3Jcbi8vIGhhbmRsaW5nIHRoYXQgbm9ybWFsaXplcyBlcnJvcnMgcmV0dXJuZWQgYnkgQ291Y2hEQlxuLy8gdG8gSmF2YVNjcmlwdCdzIG5hdGl2ZSBjb252ZW50aW9ucyBvZiBlcnJvcnMgaGF2aW5nXG4vLyBhIG5hbWUgJiBhIG1lc3NhZ2UgcHJvcGVydHkuXG4vL1xuLy8gQ29tbW9uIGVycm9ycyB0byBleHBlY3Q6XG4vL1xuLy8gKiBIb29kaWVSZXF1ZXN0RXJyb3Jcbi8vICogSG9vZGllVW5hdXRob3JpemVkRXJyb3Jcbi8vICogSG9vZGllQ29uZmxpY3RFcnJvclxuLy8gKiBIb29kaWVTZXJ2ZXJFcnJvclxuXG52YXIgaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lID0gcmVxdWlyZSgnLi4vdXRpbHMvaG9vZGllZnlfcmVxdWVzdF9lcnJvcl9uYW1lJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJyk7XG52YXIgcmVqZWN0V2l0aCA9IHJlcXVpcmUoJy4uL3V0aWxzL3Byb21pc2UvcmVqZWN0X3dpdGgnKTtcblxuZnVuY3Rpb24gaG9vZGllUmVxdWVzdChob29kaWUpIHtcbiAgdmFyICRhamF4ID0gJC5hamF4O1xuXG4gIC8vIEhvb2RpZSBiYWNrZW5kIGxpc3RlbnRzIHRvIHJlcXVlc3RzIHByZWZpeGVkIGJ5IC9fYXBpLFxuICAvLyBzbyB3ZSBwcmVmaXggYWxsIHJlcXVlc3RzIHdpdGggcmVsYXRpdmUgVVJMc1xuICB2YXIgQVBJX1BBVEggPSAnL19hcGknO1xuXG4gIC8vIFJlcXVlc3RzXG4gIC8vIC0tLS0tLS0tLS1cblxuICAvLyBzZW5kcyByZXF1ZXN0cyB0byB0aGUgaG9vZGllIGJhY2tlbmQuXG4gIC8vXG4gIC8vICAgICBwcm9taXNlID0gaG9vZGllLnJlcXVlc3QoJ0dFVCcsICcvdXNlcl9kYXRhYmFzZS9kb2NfaWQnKVxuICAvL1xuICBmdW5jdGlvbiByZXF1ZXN0KHR5cGUsIHVybCwgb3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cywgcmVxdWVzdFByb21pc2UsIHBpcGVkUHJvbWlzZTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgZGVmYXVsdHMgPSB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgIH07XG5cbiAgICAvLyBpZiBhYnNvbHV0ZSBwYXRoIHBhc3NlZCwgc2V0IENPUlMgaGVhZGVyc1xuXG4gICAgLy8gaWYgcmVsYXRpdmUgcGF0aCBwYXNzZWQsIHByZWZpeCB3aXRoIGJhc2VVcmxcbiAgICBpZiAoIS9eaHR0cC8udGVzdCh1cmwpKSB7XG4gICAgICB1cmwgPSAoaG9vZGllLmJhc2VVcmwgfHwgJycpICsgQVBJX1BBVEggKyB1cmw7XG4gICAgfVxuXG4gICAgLy8gaWYgdXJsIGlzIGNyb3NzIGRvbWFpbiwgc2V0IENPUlMgaGVhZGVyc1xuICAgIGlmICgvXmh0dHAvLnRlc3QodXJsKSkge1xuICAgICAgZGVmYXVsdHMueGhyRmllbGRzID0ge1xuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIH07XG4gICAgICBkZWZhdWx0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMudXJsID0gdXJsO1xuXG5cbiAgICAvLyB3ZSBhcmUgcGlwaW5nIHRoZSByZXN1bHQgb2YgdGhlIHJlcXVlc3QgdG8gcmV0dXJuIGEgbmljZXJcbiAgICAvLyBlcnJvciBpZiB0aGUgcmVxdWVzdCBjYW5ub3QgcmVhY2ggdGhlIHNlcnZlciBhdCBhbGwuXG4gICAgLy8gV2UgY2FuJ3QgcmV0dXJuIHRoZSBwcm9taXNlIG9mIGFqYXggZGlyZWN0bHkgYmVjYXVzZSBvZlxuICAgIC8vIHRoZSBwaXBpbmcsIGFzIGZvciB3aGF0ZXZlciByZWFzb24gdGhlIHJldHVybmVkIHByb21pc2VcbiAgICAvLyBkb2VzIG5vdCBoYXZlIHRoZSBgYWJvcnRgIG1ldGhvZCBhbnkgbW9yZSwgbWF5YmUgb3RoZXJzXG4gICAgLy8gYXMgd2VsbC4gU2VlIGFsc28gaHR0cDovL2J1Z3MuanF1ZXJ5LmNvbS90aWNrZXQvMTQxMDRcbiAgICByZXF1ZXN0UHJvbWlzZSA9ICRhamF4KGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykpO1xuICAgIHBpcGVkUHJvbWlzZSA9IHJlcXVlc3RQcm9taXNlLnRoZW4oIG51bGwsIGhhbmRsZVJlcXVlc3RFcnJvcik7XG4gICAgcGlwZWRQcm9taXNlLmFib3J0ID0gcmVxdWVzdFByb21pc2UuYWJvcnQ7XG5cbiAgICByZXR1cm4gcGlwZWRQcm9taXNlO1xuICB9XG5cbiAgLy9cbiAgLy9cbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUmVxdWVzdEVycm9yKHhocikge1xuICAgIHZhciBlcnJvcjtcblxuICAgIHRyeSB7XG4gICAgICBlcnJvciA9IHBhcnNlRXJyb3JGcm9tUmVzcG9uc2UoeGhyKTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcblxuICAgICAgaWYgKHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgZXJyb3IgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IgPSB7XG4gICAgICAgICAgbmFtZTogJ0hvb2RpZUNvbm5lY3Rpb25FcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ0NvdWxkIG5vdCBjb25uZWN0IHRvIEhvb2RpZSBzZXJ2ZXIgYXQge3t1cmx9fS4nLFxuICAgICAgICAgIHVybDogaG9vZGllLmJhc2VVcmwgfHwgJy8nXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlamVjdFdpdGgoZXJyb3IpLnByb21pc2UoKTtcbiAgfVxuXG4gIC8vXG4gIC8vIENvdWNoREIgcmV0dXJucyBlcnJvcnMgaW4gSlNPTiBmb3JtYXQsIHdpdGggdGhlIHByb3BlcnRpZXNcbiAgLy8gYGVycm9yYCBhbmQgYHJlYXNvbmAuIEhvb2RpZSB1c2VzIEphdmFTY3JpcHQncyBuYXRpdmUgRXJyb3JcbiAgLy8gcHJvcGVydGllcyBgbmFtZWAgYW5kIGBtZXNzYWdlYCBpbnN0ZWFkLCBzbyB3ZSBhcmUgbm9ybWFsaXppbmdcbiAgLy8gdGhhdC5cbiAgLy9cbiAgLy8gQmVzaWRlcyB0aGUgcmVuYW1pbmcgd2UgYWxzbyBkbyBhIG1hdGNoaW5nIHdpdGggYSBtYXAgb2Yga25vd25cbiAgLy8gZXJyb3JzIHRvIG1ha2UgdGhlbSBtb3JlIGNsZWFyLiBGb3IgcmVmZXJlbmNlLCBzZWVcbiAgLy8gaHR0cHM6Ly93aWtpLmFwYWNoZS5vcmcvY291Y2hkYi9EZWZhdWx0X2h0dHBfZXJyb3JzICZcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FwYWNoZS9jb3VjaGRiL2Jsb2IvbWFzdGVyL3NyYy9jb3VjaGRiL2NvdWNoX2h0dHBkLmVybCNMODA3XG4gIC8vXG5cbiAgZnVuY3Rpb24gcGFyc2VFcnJvckZyb21SZXNwb25zZSh4aHIpIHtcbiAgICB2YXIgZXJyb3IgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xuXG4gICAgLy8gZ2V0IGVycm9yIG5hbWVcbiAgICBlcnJvci5uYW1lID0gSFRUUF9TVEFUVVNfRVJST1JfTUFQW3hoci5zdGF0dXNdO1xuICAgIGlmICghIGVycm9yLm5hbWUpIHtcbiAgICAgIGVycm9yLm5hbWUgPSBob29kaWVmeVJlcXVlc3RFcnJvck5hbWUoZXJyb3IuZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlIHN0YXR1cyAmIG1lc3NhZ2VcbiAgICBlcnJvci5zdGF0dXMgPSB4aHIuc3RhdHVzO1xuICAgIGVycm9yLm1lc3NhZ2UgPSBlcnJvci5yZWFzb24gfHwgJyc7XG4gICAgZXJyb3IubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBlcnJvci5tZXNzYWdlLnNsaWNlKDEpO1xuXG4gICAgLy8gY2xlYW51cFxuICAgIGRlbGV0ZSBlcnJvci5lcnJvcjtcbiAgICBkZWxldGUgZXJyb3IucmVhc29uO1xuXG4gICAgcmV0dXJuIGVycm9yO1xuICB9XG5cbiAgLy8gbWFwIENvdWNoREIgSFRUUCBzdGF0dXMgY29kZXMgdG8gSG9vZGllIEVycm9yc1xuICB2YXIgSFRUUF9TVEFUVVNfRVJST1JfTUFQID0ge1xuICAgIDQwMDogJ0hvb2RpZVJlcXVlc3RFcnJvcicsIC8vIGJhZCByZXF1ZXN0XG4gICAgNDAxOiAnSG9vZGllVW5hdXRob3JpemVkRXJyb3InLFxuICAgIDQwMzogJ0hvb2RpZVJlcXVlc3RFcnJvcicsIC8vIGZvcmJpZGRlblxuICAgIDQwNDogJ0hvb2RpZU5vdEZvdW5kRXJyb3InLCAvLyBmb3JiaWRkZW5cbiAgICA0MDk6ICdIb29kaWVDb25mbGljdEVycm9yJyxcbiAgICA0MTI6ICdIb29kaWVDb25mbGljdEVycm9yJywgLy8gZmlsZSBleGlzdFxuICAgIDUwMDogJ0hvb2RpZVNlcnZlckVycm9yJ1xuICB9O1xuXG4gIC8vXG4gIC8vIHB1YmxpYyBBUElcbiAgLy9cbiAgaG9vZGllLnJlcXVlc3QgPSByZXF1ZXN0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVJlcXVlc3Q7XG4iLCIvLyBIb29kaWUgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS1cblxuLy8gV2l0aCB0aGUgY3VzdG9tIGhvb2RpZSBlcnJvciBmdW5jdGlvblxuLy8gd2Ugbm9ybWFsaXplIGFsbCBlcnJvcnMgdGhlIGdldCByZXR1cm5lZFxuLy8gd2hlbiB1c2luZyBob29kaWUncyByZWplY3RXaXRoXG4vL1xuLy8gVGhlIG5hdGl2ZSBKYXZhU2NyaXB0IGVycm9yIG1ldGhvZCBoYXNcbi8vIGEgbmFtZSAmIGEgbWVzc2FnZSBwcm9wZXJ0eS4gSG9vZGllRXJyb3Jcbi8vIHJlcXVpcmVzIHRoZXNlLCBidXQgb24gdG9wIGFsbG93cyBmb3Jcbi8vIHVubGltaXRlZCBjdXN0b20gcHJvcGVydGllcy5cbi8vXG4vLyBJbnN0ZWFkIG9mIGJlaW5nIGluaXRpYWxpemVkIHdpdGgganVzdFxuLy8gdGhlIG1lc3NhZ2UsIEhvb2RpZUVycm9yIGV4cGVjdHMgYW5cbi8vIG9iamVjdCB3aXRoIHByb3Blcml0ZXMuIFRoZSBgbWVzc2FnZWBcbi8vIHByb3BlcnR5IGlzIHJlcXVpcmVkLiBUaGUgbmFtZSB3aWxsXG4vLyBmYWxsYmFjayB0byBgZXJyb3JgLlxuLy9cbi8vIGBtZXNzYWdlYCBjYW4gYWxzbyBjb250YWluIHBsYWNlaG9sZGVyc1xuLy8gaW4gdGhlIGZvcm0gb2YgYHt7cHJvcGVydHlOYW1lfX1gYCB3aGljaFxuLy8gd2lsbCBnZXQgcmVwbGFjZWQgYXV0b21hdGljYWxseSB3aXRoIHBhc3NlZFxuLy8gZXh0cmEgcHJvcGVydGllcy5cbi8vXG4vLyAjIyMgRXJyb3IgQ29udmVudGlvbnNcbi8vXG4vLyBXZSBmb2xsb3cgSmF2YVNjcmlwdCdzIG5hdGl2ZSBlcnJvciBjb252ZW50aW9ucyxcbi8vIG1lYW5pbmcgdGhhdCBlcnJvciBuYW1lcyBhcmUgY2FtZWxDYXNlIHdpdGggdGhlXG4vLyBmaXJzdCBsZXR0ZXIgdXBwZXJjYXNlIGFzIHdlbGwsIGFuZCB0aGUgbWVzc2FnZVxuLy8gc3RhcnRpbmcgd2l0aCBhbiB1cHBlcmNhc2UgbGV0dGVyLlxuLy9cbnZhciBlcnJvck1lc3NhZ2VSZXBsYWNlUGF0dGVybiA9IC9cXHtcXHtcXHMqXFx3K1xccypcXH1cXH0vZztcbnZhciBlcnJvck1lc3NhZ2VGaW5kUHJvcGVydHlQYXR0ZXJuID0gL1xcdysvO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJyk7XG5cbmZ1bmN0aW9uIEhvb2RpZUVycm9yKHByb3BlcnRpZXMpIHtcblxuICAvLyBub3JtYWxpemUgYXJndW1lbnRzXG4gIGlmICh0eXBlb2YgcHJvcGVydGllcyA9PT0gJ3N0cmluZycpIHtcbiAgICBwcm9wZXJ0aWVzID0ge1xuICAgICAgbWVzc2FnZTogcHJvcGVydGllc1xuICAgIH07XG4gIH1cblxuICBpZiAoISBwcm9wZXJ0aWVzLm1lc3NhZ2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZBVEFMOiBlcnJvci5tZXNzYWdlIG11c3QgYmUgc2V0Jyk7XG4gIH1cblxuICAvLyBtdXN0IGNoZWNrIGZvciBwcm9wZXJ0aWVzLCBhcyB0aGlzLm5hbWUgaXMgYWx3YXlzIHNldC5cbiAgaWYgKCEgcHJvcGVydGllcy5uYW1lKSB7XG4gICAgcHJvcGVydGllcy5uYW1lID0gJ0hvb2RpZUVycm9yJztcbiAgfVxuXG4gIHByb3BlcnRpZXMubWVzc2FnZSA9IHByb3BlcnRpZXMubWVzc2FnZS5yZXBsYWNlKGVycm9yTWVzc2FnZVJlcGxhY2VQYXR0ZXJuLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHZhciBwcm9wZXJ0eSA9IG1hdGNoLm1hdGNoKGVycm9yTWVzc2FnZUZpbmRQcm9wZXJ0eVBhdHRlcm4pWzBdO1xuICAgIHJldHVybiBwcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgfSk7XG4gIGV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cbkhvb2RpZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuSG9vZGllRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSG9vZGllRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllRXJyb3I7XG5cbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IElEcy5cbi8vXG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cbi8vXG5mdW5jdGlvbiBIb29kaWVPYmplY3RJZEVycm9yKHByb3BlcnRpZXMpIHtcbiAgcHJvcGVydGllcy5uYW1lID0gJ0hvb2RpZU9iamVjdElkRXJyb3InO1xuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSAnXCJ7e2lkfX1cIiBpcyBpbnZhbGlkIG9iamVjdCBpZC4ge3tydWxlc319Lic7XG5cbiAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcihwcm9wZXJ0aWVzKTtcbn1cbnZhciB2YWxpZElkUGF0dGVybiA9IC9eW2EtejAtOVxcLV0rJC87XG5Ib29kaWVPYmplY3RJZEVycm9yLmlzSW52YWxpZCA9IGZ1bmN0aW9uKGlkLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAhKGN1c3RvbVBhdHRlcm4gfHwgdmFsaWRJZFBhdHRlcm4pLnRlc3QoaWQgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdElkRXJyb3IuaXNWYWxpZCA9IGZ1bmN0aW9uKGlkLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZElkUGF0dGVybikudGVzdChpZCB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0SWRFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnTG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0SWRFcnJvcjtcbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IHR5cGVzLCBwbHVzIG11c3Qgc3RhcnRcbi8vIHdpdGggYSBsZXR0ZXIuXG4vL1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG4vLyBIb29kaWUgSW52YWxpZCBUeXBlIE9yIElkIEVycm9yXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIG9ubHkgbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlc1xuLy8gYXJlIGFsbG93ZWQgZm9yIG9iamVjdCB0eXBlcywgcGx1cyBtdXN0IHN0YXJ0XG4vLyB3aXRoIGEgbGV0dGVyLlxuLy9cbmZ1bmN0aW9uIEhvb2RpZU9iamVjdFR5cGVFcnJvcihwcm9wZXJ0aWVzKSB7XG4gIHByb3BlcnRpZXMubmFtZSA9ICdIb29kaWVPYmplY3RUeXBlRXJyb3InO1xuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSAnXCJ7e3R5cGV9fVwiIGlzIGludmFsaWQgb2JqZWN0IHR5cGUuIHt7cnVsZXN9fS4nO1xuXG4gIHJldHVybiBuZXcgSG9vZGllRXJyb3IocHJvcGVydGllcyk7XG59XG52YXIgdmFsaWRUeXBlUGF0dGVybiA9IC9eW2EteiRdW2EtejAtOV0rJC87XG5Ib29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkID0gZnVuY3Rpb24odHlwZSwgY3VzdG9tUGF0dGVybikge1xuICByZXR1cm4gIShjdXN0b21QYXR0ZXJuIHx8IHZhbGlkVHlwZVBhdHRlcm4pLnRlc3QodHlwZSB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0VHlwZUVycm9yLmlzVmFsaWQgPSBmdW5jdGlvbih0eXBlLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZFR5cGVQYXR0ZXJuKS50ZXN0KHR5cGUgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdFR5cGVFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0VHlwZUVycm9yO1xuIiwiLy8gRXZlbnRzXG4vLyA9PT09PT09PVxuLy9cbi8vIGV4dGVuZCBhbnkgQ2xhc3Mgd2l0aCBzdXBwb3J0IGZvclxuLy9cbi8vICogYG9iamVjdC5iaW5kKCdldmVudCcsIGNiKWBcbi8vICogYG9iamVjdC51bmJpbmQoJ2V2ZW50JywgY2IpYFxuLy8gKiBgb2JqZWN0LnRyaWdnZXIoJ2V2ZW50JywgYXJncy4uLilgXG4vLyAqIGBvYmplY3Qub25lKCdldicsIGNiKWBcbi8vXG4vLyBiYXNlZCBvbiBbRXZlbnRzIGltcGxlbWVudGF0aW9ucyBmcm9tIFNwaW5lXShodHRwczovL2dpdGh1Yi5jb20vbWFjY21hbi9zcGluZS9ibG9iL21hc3Rlci9zcmMvc3BpbmUuY29mZmVlI0wxKVxuLy9cblxuLy8gY2FsbGJhY2tzIGFyZSBnbG9iYWwsIHdoaWxlIHRoZSBldmVudHMgQVBJIGlzIHVzZWQgYXQgc2V2ZXJhbCBwbGFjZXMsXG4vLyBsaWtlIGhvb2RpZS5vbiAvIGhvb2RpZS5zdG9yZS5vbiAvIGhvb2RpZS50YXNrLm9uIGV0Yy5cbi8vXG5mdW5jdGlvbiBob29kaWVFdmVudHMoaG9vZGllLCBvcHRpb25zKSB7XG4gIHZhciBjb250ZXh0ID0gaG9vZGllO1xuICB2YXIgbmFtZXNwYWNlID0gJyc7XG5cbiAgLy8gbm9ybWFsaXplIG9wdGlvbnMgaGFzaFxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBtYWtlIHN1cmUgY2FsbGJhY2tzIGhhc2ggZXhpc3RzXG4gIGlmICghaG9vZGllLmV2ZW50c0NhbGxiYWNrcykge1xuICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gb3B0aW9ucy5jb250ZXh0O1xuICAgIG5hbWVzcGFjZSA9IG9wdGlvbnMubmFtZXNwYWNlICsgJzonO1xuICB9XG5cbiAgLy8gQmluZFxuICAvLyAtLS0tLS1cbiAgLy9cbiAgLy8gYmluZCBhIGNhbGxiYWNrIHRvIGFuIGV2ZW50IHRyaWdnZXJkIGJ5IHRoZSBvYmplY3RcbiAgLy9cbiAgLy8gICAgIG9iamVjdC5iaW5kICdjaGVhdCcsIGJsYW1lXG4gIC8vXG4gIGZ1bmN0aW9uIGJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGV2cywgbmFtZSwgX2ksIF9sZW47XG5cbiAgICBldnMgPSBldi5zcGxpdCgnICcpO1xuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBldnMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIG5hbWUgPSBuYW1lc3BhY2UgKyBldnNbX2ldO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tuYW1lXSA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbbmFtZV0gfHwgW107XG4gICAgICBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8vIG9uZVxuICAvLyAtLS0tLVxuICAvL1xuICAvLyBzYW1lIGFzIGBiaW5kYCwgYnV0IGRvZXMgZ2V0IGV4ZWN1dGVkIG9ubHkgb25jZVxuICAvL1xuICAvLyAgICAgb2JqZWN0Lm9uZSAnZ3JvdW5kVG91Y2gnLCBnYW1lT3ZlclxuICAvL1xuICBmdW5jdGlvbiBvbmUoZXYsIGNhbGxiYWNrKSB7XG4gICAgZXYgPSBuYW1lc3BhY2UgKyBldjtcbiAgICB2YXIgd3JhcHBlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBob29kaWUudW5iaW5kKGV2LCB3cmFwcGVyKTtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgaG9vZGllLmJpbmQoZXYsIHdyYXBwZXIpO1xuICB9XG5cbiAgLy8gdHJpZ2dlclxuICAvLyAtLS0tLS0tLS1cbiAgLy9cbiAgLy8gdHJpZ2dlciBhbiBldmVudCBhbmQgcGFzcyBvcHRpb25hbCBwYXJhbWV0ZXJzIGZvciBiaW5kaW5nLlxuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIgJ3dpbicsIHNjb3JlOiAxMjMwXG4gIC8vXG4gIGZ1bmN0aW9uIHRyaWdnZXIoKSB7XG4gICAgdmFyIGFyZ3MsIGNhbGxiYWNrLCBldiwgbGlzdCwgX2ksIF9sZW47XG5cbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIGV2ID0gYXJncy5zaGlmdCgpO1xuICAgIGV2ID0gbmFtZXNwYWNlICsgZXY7XG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBsaXN0Lmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBjYWxsYmFjayA9IGxpc3RbX2ldO1xuICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyB1bmJpbmRcbiAgLy8gLS0tLS0tLS1cbiAgLy9cbiAgLy8gdW5iaW5kIHRvIGZyb20gYWxsIGJpbmRpbmdzLCBmcm9tIGFsbCBiaW5kaW5ncyBvZiBhIHNwZWNpZmljIGV2ZW50XG4gIC8vIG9yIGZyb20gYSBzcGVjaWZpYyBiaW5kaW5nLlxuICAvL1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCgpXG4gIC8vICAgICBvYmplY3QudW5iaW5kICdtb3ZlJ1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCAnbW92ZScsIGZvbGxvd1xuICAvL1xuICBmdW5jdGlvbiB1bmJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNiLCBpLCBsaXN0LCBfaSwgX2xlbiwgZXZOYW1lcztcblxuICAgIGlmICghZXYpIHtcbiAgICAgIGlmICghbmFtZXNwYWNlKSB7XG4gICAgICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgICAgIH1cblxuICAgICAgZXZOYW1lcyA9IE9iamVjdC5rZXlzKGhvb2RpZS5ldmVudHNDYWxsYmFja3MpO1xuICAgICAgZXZOYW1lcyA9IGV2TmFtZXMuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5LmluZGV4T2YobmFtZXNwYWNlKSA9PT0gMDtcbiAgICAgIH0pO1xuICAgICAgZXZOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBkZWxldGUgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1trZXldO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldiA9IG5hbWVzcGFjZSArIGV2O1xuXG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgZGVsZXRlIGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoaSA9IF9pID0gMCwgX2xlbiA9IGxpc3QubGVuZ3RoOyBfaSA8IF9sZW47IGkgPSArK19pKSB7XG4gICAgICBjYiA9IGxpc3RbaV07XG5cblxuICAgICAgaWYgKGNiICE9PSBjYWxsYmFjaykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGlzdCA9IGxpc3Quc2xpY2UoKTtcbiAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl0gPSBsaXN0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGV4dC5iaW5kID0gYmluZDtcbiAgY29udGV4dC5vbiA9IGJpbmQ7XG4gIGNvbnRleHQub25lID0gb25lO1xuICBjb250ZXh0LnRyaWdnZXIgPSB0cmlnZ2VyO1xuICBjb250ZXh0LnVuYmluZCA9IHVuYmluZDtcbiAgY29udGV4dC5vZmYgPSB1bmJpbmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllRXZlbnRzO1xuIiwiLy8gU3RvcmVcbi8vID09PT09PT09PT09PVxuXG4vLyBUaGlzIGNsYXNzIGRlZmluZXMgdGhlIEFQSSB0aGF0IGhvb2RpZS5zdG9yZSAobG9jYWwgc3RvcmUpIGFuZCBob29kaWUub3BlblxuLy8gKHJlbW90ZSBzdG9yZSkgaW1wbGVtZW50IHRvIGFzc3VyZSBhIGNvaGVyZW50IEFQSS4gSXQgYWxzbyBpbXBsZW1lbnRzIHNvbWVcbi8vIGJhc2ljIHZhbGlkYXRpb25zLlxuLy9cbi8vIFRoZSByZXR1cm5lZCBBUEkgcHJvdmlkZXMgdGhlIGZvbGxvd2luZyBtZXRob2RzOlxuLy9cbi8vICogdmFsaWRhdGVcbi8vICogc2F2ZVxuLy8gKiBhZGRcbi8vICogZmluZFxuLy8gKiBmaW5kT3JBZGRcbi8vICogZmluZEFsbFxuLy8gKiB1cGRhdGVcbi8vICogdXBkYXRlQWxsXG4vLyAqIHJlbW92ZVxuLy8gKiByZW1vdmVBbGxcbi8vICogZGVjb3JhdGVQcm9taXNlc1xuLy8gKiB0cmlnZ2VyXG4vLyAqIG9uXG4vLyAqIHVuYmluZFxuLy9cbi8vIEF0IHRoZSBzYW1lIHRpbWUsIHRoZSByZXR1cm5lZCBBUEkgY2FuIGJlIGNhbGxlZCBhcyBmdW5jdGlvbiByZXR1cm5pbmcgYVxuLy8gc3RvcmUgc2NvcGVkIGJ5IHRoZSBwYXNzZWQgdHlwZSwgZm9yIGV4YW1wbGVcbi8vXG4vLyAgICAgdmFyIHRhc2tTdG9yZSA9IGhvb2RpZS5zdG9yZSgndGFzaycpO1xuLy8gICAgIHRhc2tTdG9yZS5maW5kQWxsKCkudGhlbiggc2hvd0FsbFRhc2tzICk7XG4vLyAgICAgdGFza1N0b3JlLnVwZGF0ZSgnaWQxMjMnLCB7ZG9uZTogdHJ1ZX0pO1xuLy9cblxuLy9cbnZhciBob29kaWVTY29wZWRTdG9yZUFwaSA9IHJlcXVpcmUoJy4vc2NvcGVkJyk7XG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vZXZlbnRzJyk7XG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci9lcnJvcicpO1xudmFyIEhvb2RpZU9iamVjdFR5cGVFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yL29iamVjdF90eXBlJyk7XG52YXIgSG9vZGllT2JqZWN0SWRFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yL29iamVjdF9pZCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpO1xuXG52YXIgZ2V0RGVmZXIgPSByZXF1aXJlKCcuLi8uLi91dGlscy9wcm9taXNlL2RlZmVyJyk7XG52YXIgcmVqZWN0V2l0aCA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL3Byb21pc2UvcmVqZWN0X3dpdGgnKTtcbnZhciByZXNvbHZlV2l0aCA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL3Byb21pc2UvcmVzb2x2ZV93aXRoJyk7XG52YXIgaXNQcm9taXNlID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvcHJvbWlzZS9pc19wcm9taXNlJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTdG9yZUFwaShob29kaWUsIG9wdGlvbnMpIHtcblxuICAvLyBwZXJzaXN0YW5jZSBsb2dpY1xuICB2YXIgYmFja2VuZCA9IHt9O1xuXG4gIC8vIGV4dGVuZCB0aGlzIHByb3BlcnR5IHdpdGggZXh0cmEgZnVuY3Rpb25zIHRoYXQgd2lsbCBiZSBhdmFpbGFibGVcbiAgLy8gb24gYWxsIHByb21pc2VzIHJldHVybmVkIGJ5IGhvb2RpZS5zdG9yZSBBUEkuIEl0IGhhcyBhIHJlZmVyZW5jZVxuICAvLyB0byBjdXJyZW50IGhvb2RpZSBpbnN0YW5jZSBieSBkZWZhdWx0XG4gIHZhciBwcm9taXNlQXBpID0ge1xuICAgIGhvb2RpZTogaG9vZGllXG4gIH07XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG5cbiAgLy8gcHVibGljIEFQSVxuICB2YXIgYXBpID0gZnVuY3Rpb24gYXBpKHR5cGUsIGlkKSB7XG4gICAgdmFyIHNjb3BlZE9wdGlvbnMgPSBleHRlbmQodHJ1ZSwge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIGlkOiBpZFxuICAgIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBob29kaWVTY29wZWRTdG9yZUFwaShob29kaWUsIGFwaSwgc2NvcGVkT3B0aW9ucyk7XG4gIH07XG5cbiAgLy8gYWRkIGV2ZW50IEFQSVxuICBob29kaWVFdmVudHMoaG9vZGllLCB7XG4gICAgY29udGV4dDogYXBpLFxuICAgIG5hbWVzcGFjZTogc3RvcmVOYW1lXG4gIH0pO1xuXG5cbiAgLy8gVmFsaWRhdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBieSBkZWZhdWx0LCB3ZSBvbmx5IGNoZWNrIGZvciBhIHZhbGlkIHR5cGUgJiBpZC5cbiAgLy8gdGhlIHZhbGlkYXRlIG1ldGhvZCBjYW4gYmUgb3ZlcndyaXRlbiBieSBwYXNzaW5nXG4gIC8vIG9wdGlvbnMudmFsaWRhdGVcbiAgLy9cbiAgLy8gaWYgYHZhbGlkYXRlYCByZXR1cm5zIG5vdGhpbmcsIHRoZSBwYXNzZWQgb2JqZWN0IGlzXG4gIC8vIHZhbGlkLiBPdGhlcndpc2UgaXQgcmV0dXJucyBhbiBlcnJvclxuICAvL1xuICBhcGkudmFsaWRhdGUgPSBvcHRpb25zLnZhbGlkYXRlO1xuXG4gIGlmICghb3B0aW9ucy52YWxpZGF0ZSkge1xuICAgIGFwaS52YWxpZGF0ZSA9IGZ1bmN0aW9uKG9iamVjdCAvKiwgb3B0aW9ucyAqLyApIHtcblxuICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcih7XG4gICAgICAgICAgbmFtZTogJ0ludmFsaWRPYmplY3RFcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIG9iamVjdCBwYXNzZWQuJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKEhvb2RpZU9iamVjdFR5cGVFcnJvci5pc0ludmFsaWQob2JqZWN0LnR5cGUsIHZhbGlkSWRPclR5cGVQYXR0ZXJuKSkge1xuICAgICAgICByZXR1cm4gbmV3IEhvb2RpZU9iamVjdFR5cGVFcnJvcih7XG4gICAgICAgICAgdHlwZTogb2JqZWN0LnR5cGUsXG4gICAgICAgICAgcnVsZXM6IHZhbGlkSWRPclR5cGVSdWxlc1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFvYmplY3QuaWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoSG9vZGllT2JqZWN0SWRFcnJvci5pc0ludmFsaWQob2JqZWN0LmlkLCB2YWxpZElkT3JUeXBlUGF0dGVybikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVPYmplY3RJZEVycm9yKHtcbiAgICAgICAgICBpZDogb2JqZWN0LmlkLFxuICAgICAgICAgIHJ1bGVzOiB2YWxpZElkT3JUeXBlUnVsZXNcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gIH1cblxuICAvLyBTYXZlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gY3JlYXRlcyBvciByZXBsYWNlcyBhbiBhbiBldmVudHVhbGx5IGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgc3RvcmVcbiAgLy8gd2l0aCBzYW1lIHR5cGUgJiBpZC5cbiAgLy9cbiAgLy8gV2hlbiBpZCBpcyB1bmRlZmluZWQsIGl0IGdldHMgZ2VuZXJhdGVkIGFuZCBhIG5ldyBvYmplY3QgZ2V0cyBzYXZlZFxuICAvL1xuICAvLyBleGFtcGxlIHVzYWdlOlxuICAvL1xuICAvLyAgICAgc3RvcmUuc2F2ZSgnY2FyJywgdW5kZWZpbmVkLCB7Y29sb3I6ICdyZWQnfSlcbiAgLy8gICAgIHN0b3JlLnNhdmUoJ2NhcicsICdhYmM0NTY3Jywge2NvbG9yOiAncmVkJ30pXG4gIC8vXG4gIGFwaS5zYXZlID0gZnVuY3Rpb24gc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucykge1xuXG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQodHJ1ZSwge30sIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgLy8gZG9uJ3QgbWVzcyB3aXRoIHBhc3NlZCBvYmplY3RcbiAgICB2YXIgb2JqZWN0ID0gZXh0ZW5kKHRydWUsIHt9LCBwcm9wZXJ0aWVzLCB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgaWQ6IGlkXG4gICAgfSk7XG5cbiAgICAvLyB2YWxpZGF0aW9uc1xuICAgIHZhciBlcnJvciA9IGFwaS52YWxpZGF0ZShvYmplY3QsIG9wdGlvbnMgfHwge30pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4gcmVqZWN0V2l0aChlcnJvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZShiYWNrZW5kLnNhdmUob2JqZWN0LCBvcHRpb25zIHx8IHt9KSk7XG4gIH07XG5cblxuICAvLyBBZGRcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGAuYWRkYCBpcyBhbiBhbGlhcyBmb3IgYC5zYXZlYCwgd2l0aCB0aGUgZGlmZmVyZW5jZSB0aGF0IHRoZXJlIGlzIG5vIGlkIGFyZ3VtZW50LlxuICAvLyBJbnRlcm5hbGx5IGl0IHNpbXBseSBjYWxscyBgLnNhdmUodHlwZSwgdW5kZWZpbmVkLCBvYmplY3QpLlxuICAvL1xuICBhcGkuYWRkID0gZnVuY3Rpb24gYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcblxuICAgIGlmIChwcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBhcGkuc2F2ZSh0eXBlLCBwcm9wZXJ0aWVzLmlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgfTtcblxuXG4gIC8vIGZpbmRcbiAgLy8gLS0tLS0tXG5cbiAgLy9cbiAgYXBpLmZpbmQgPSBmdW5jdGlvbiBmaW5kKHR5cGUsIGlkKSB7XG5cbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQuZmluZCh0eXBlLCBpZCkpO1xuICB9O1xuXG5cbiAgLy8gZmluZCBvciBhZGRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vIDEuIFRyeSB0byBmaW5kIGEgc2hhcmUgYnkgZ2l2ZW4gaWRcbiAgLy8gMi4gSWYgc2hhcmUgY291bGQgYmUgZm91bmQsIHJldHVybiBpdFxuICAvLyAzLiBJZiBub3QsIGFkZCBvbmUgYW5kIHJldHVybiBpdC5cbiAgLy9cbiAgYXBpLmZpbmRPckFkZCA9IGZ1bmN0aW9uIGZpbmRPckFkZCh0eXBlLCBpZCwgcHJvcGVydGllcykge1xuXG4gICAgaWYgKHByb3BlcnRpZXMgPT09IG51bGwpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVOb3RGb3VuZCgpIHtcbiAgICAgIHZhciBuZXdQcm9wZXJ0aWVzO1xuICAgICAgbmV3UHJvcGVydGllcyA9IGV4dGVuZCh0cnVlLCB7XG4gICAgICAgIGlkOiBpZFxuICAgICAgfSwgcHJvcGVydGllcyk7XG4gICAgICByZXR1cm4gYXBpLmFkZCh0eXBlLCBuZXdQcm9wZXJ0aWVzKTtcbiAgICB9XG5cbiAgICAvLyBwcm9taXNlIGRlY29yYXRpb25zIGdldCBsb3N0IHdoZW4gcGlwZWQgdGhyb3VnaCBgdGhlbmAsXG4gICAgLy8gdGhhdCdzIHdoeSB3ZSBuZWVkIHRvIGRlY29yYXRlIHRoZSBmaW5kJ3MgcHJvbWlzZSBhZ2Fpbi5cbiAgICB2YXIgcHJvbWlzZSA9IGFwaS5maW5kKHR5cGUsIGlkKS50aGVuKG51bGwsIGhhbmRsZU5vdEZvdW5kKTtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKHByb21pc2UpO1xuICB9O1xuXG5cbiAgLy8gZmluZEFsbFxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyByZXR1cm5zIGFsbCBvYmplY3RzIGZyb20gc3RvcmUuXG4gIC8vIENhbiBiZSBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgdHlwZSBvciBhIGZ1bmN0aW9uXG4gIC8vXG4gIGFwaS5maW5kQWxsID0gZnVuY3Rpb24gZmluZEFsbCh0eXBlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5maW5kQWxsKHR5cGUsIG9wdGlvbnMpICk7XG4gIH07XG5cblxuICAvLyBVcGRhdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEluIGNvbnRyYXN0IHRvIGAuc2F2ZWAsIHRoZSBgLnVwZGF0ZWAgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIHN0b3JlZCBvYmplY3QsXG4gIC8vIGJ1dCBvbmx5IGNoYW5nZXMgdGhlIHBhc3NlZCBhdHRyaWJ1dGVzIG9mIGFuIGV4c3Rpbmcgb2JqZWN0LCBpZiBpdCBleGlzdHNcbiAgLy9cbiAgLy8gYm90aCBhIGhhc2ggb2Yga2V5L3ZhbHVlcyBvciBhIGZ1bmN0aW9uIHRoYXQgYXBwbGllcyB0aGUgdXBkYXRlIHRvIHRoZSBwYXNzZWRcbiAgLy8gb2JqZWN0IGNhbiBiZSBwYXNzZWQuXG4gIC8vXG4gIC8vIGV4YW1wbGUgdXNhZ2VcbiAgLy9cbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZSgnY2FyJywgJ2FiYzQ1NjcnLCB7c29sZDogdHJ1ZX0pXG4gIC8vIGhvb2RpZS5zdG9yZS51cGRhdGUoJ2NhcicsICdhYmM0NTY3JywgZnVuY3Rpb24ob2JqKSB7IG9iai5zb2xkID0gdHJ1ZSB9KVxuICAvL1xuICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUZvdW5kKGN1cnJlbnRPYmplY3QpIHtcbiAgICAgIHZhciBjaGFuZ2VkUHJvcGVydGllcywgbmV3T2JqLCB2YWx1ZTtcblxuICAgICAgLy8gbm9ybWFsaXplIGlucHV0XG4gICAgICBuZXdPYmogPSBleHRlbmQodHJ1ZSwge30sIGN1cnJlbnRPYmplY3QpO1xuXG4gICAgICBpZiAodHlwZW9mIG9iamVjdFVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvYmplY3RVcGRhdGUgPSBvYmplY3RVcGRhdGUobmV3T2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFvYmplY3RVcGRhdGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVXaXRoKGN1cnJlbnRPYmplY3QpO1xuICAgICAgfVxuXG4gICAgICAvLyBjaGVjayBpZiBzb21ldGhpbmcgY2hhbmdlZFxuICAgICAgY2hhbmdlZFByb3BlcnRpZXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RVcGRhdGUpIHtcbiAgICAgICAgICBpZiAob2JqZWN0VXBkYXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0VXBkYXRlW2tleV07XG4gICAgICAgICAgICBpZiAoKGN1cnJlbnRPYmplY3Rba2V5XSAhPT0gdmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgZm9yIHVuZGVmaW5lZCB2YWx1ZXMsIGFzIGV4dGVuZCBpZ25vcmVzIHRoZXNlXG4gICAgICAgICAgICBuZXdPYmpba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgX3Jlc3VsdHMucHVzaChrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX3Jlc3VsdHM7XG4gICAgICB9KSgpO1xuXG4gICAgICBpZiAoIShjaGFuZ2VkUHJvcGVydGllcy5sZW5ndGggfHwgb3B0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVXaXRoKG5ld09iaik7XG4gICAgICB9XG5cbiAgICAgIC8vYXBwbHkgdXBkYXRlXG4gICAgICByZXR1cm4gYXBpLnNhdmUodHlwZSwgaWQsIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLy8gcHJvbWlzZSBkZWNvcmF0aW9ucyBnZXQgbG9zdCB3aGVuIHBpcGVkIHRocm91Z2ggYHRoZW5gLFxuICAgIC8vIHRoYXQncyB3aHkgd2UgbmVlZCB0byBkZWNvcmF0ZSB0aGUgZmluZCdzIHByb21pc2UgYWdhaW4uXG4gICAgdmFyIHByb21pc2UgPSBhcGkuZmluZCh0eXBlLCBpZCkudGhlbihoYW5kbGVGb3VuZCk7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZShwcm9taXNlKTtcbiAgfTtcblxuXG4gIC8vIHVwZGF0ZU9yQWRkXG4gIC8vIC0tLS0tLS0tLS0tLS1cblxuICAvLyBzYW1lIGFzIGAudXBkYXRlKClgLCBidXQgaW4gY2FzZSB0aGUgb2JqZWN0IGNhbm5vdCBiZSBmb3VuZCxcbiAgLy8gaXQgZ2V0cyBjcmVhdGVkXG4gIC8vXG4gIGFwaS51cGRhdGVPckFkZCA9IGZ1bmN0aW9uIHVwZGF0ZU9yQWRkKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICBmdW5jdGlvbiBoYW5kbGVOb3RGb3VuZCgpIHtcbiAgICAgIHZhciBwcm9wZXJ0aWVzID0gZXh0ZW5kKHRydWUsIHt9LCBvYmplY3RVcGRhdGUsIHtcbiAgICAgICAgaWQ6IGlkXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGFwaS5hZGQodHlwZSwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBhcGkudXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpLnRoZW4obnVsbCwgaGFuZGxlTm90Rm91bmQpO1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZShwcm9taXNlKTtcbiAgfTtcblxuXG4gIC8vIHVwZGF0ZUFsbFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHVwZGF0ZSBhbGwgb2JqZWN0cyBpbiB0aGUgc3RvcmUsIGNhbiBiZSBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgZnVuY3Rpb25cbiAgLy8gQXMgYW4gYWx0ZXJuYXRpdmUsIGFuIGFycmF5IG9mIG9iamVjdHMgY2FuIGJlIHBhc3NlZFxuICAvL1xuICAvLyBleGFtcGxlIHVzYWdlXG4gIC8vXG4gIC8vIGhvb2RpZS5zdG9yZS51cGRhdGVBbGwoKVxuICAvL1xuICBhcGkudXBkYXRlQWxsID0gZnVuY3Rpb24gdXBkYXRlQWxsKGZpbHRlck9yT2JqZWN0cywgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSB7XG4gICAgdmFyIHByb21pc2U7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIG5vcm1hbGl6ZSB0aGUgaW5wdXQ6IG1ha2Ugc3VyZSB3ZSBoYXZlIGFsbCBvYmplY3RzXG4gICAgc3dpdGNoICh0cnVlKSB7XG4gICAgY2FzZSB0eXBlb2YgZmlsdGVyT3JPYmplY3RzID09PSAnc3RyaW5nJzpcbiAgICAgIHByb21pc2UgPSBhcGkuZmluZEFsbChmaWx0ZXJPck9iamVjdHMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBpc1Byb21pc2UoZmlsdGVyT3JPYmplY3RzKTpcbiAgICAgIHByb21pc2UgPSBmaWx0ZXJPck9iamVjdHM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICQuaXNBcnJheShmaWx0ZXJPck9iamVjdHMpOlxuICAgICAgcHJvbWlzZSA9IGdldERlZmVyKCkucmVzb2x2ZShmaWx0ZXJPck9iamVjdHMpLnByb21pc2UoKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBlLmcuIG51bGwsIHVwZGF0ZSBhbGxcbiAgICAgIHByb21pc2UgPSBhcGkuZmluZEFsbCgpO1xuICAgIH1cblxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oZnVuY3Rpb24ob2JqZWN0cykge1xuICAgICAgLy8gbm93IHdlIHVwZGF0ZSBhbGwgb2JqZWN0cyBvbmUgYnkgb25lIGFuZCByZXR1cm4gYSBwcm9taXNlXG4gICAgICAvLyB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgb25jZSBhbGwgdXBkYXRlcyBoYXZlIGJlZW4gZmluaXNoZWRcbiAgICAgIHZhciBvYmplY3QsIF91cGRhdGVQcm9taXNlcztcblxuICAgICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgICAgb2JqZWN0cyA9IFtvYmplY3RzXTtcbiAgICAgIH1cblxuICAgICAgX3VwZGF0ZVByb21pc2VzID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgICAgICBfcmVzdWx0cyA9IFtdO1xuICAgICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IG9iamVjdHMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgICAgICBfcmVzdWx0cy5wdXNoKGFwaS51cGRhdGUob2JqZWN0LnR5cGUsIG9iamVjdC5pZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXN1bHRzO1xuICAgICAgfSkoKTtcblxuICAgICAgcmV0dXJuICQud2hlbi5hcHBseShudWxsLCBfdXBkYXRlUHJvbWlzZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZShwcm9taXNlKTtcbiAgfTtcblxuXG4gIC8vIFJlbW92ZVxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBSZW1vdmVzIG9uZSBvYmplY3Qgc3BlY2lmaWVkIGJ5IGB0eXBlYCBhbmQgYGlkYC5cbiAgLy9cbiAgLy8gd2hlbiBvYmplY3QgaGFzIGJlZW4gc3luY2VkIGJlZm9yZSwgbWFyayBpdCBhcyBkZWxldGVkLlxuICAvLyBPdGhlcndpc2UgcmVtb3ZlIGl0IGZyb20gU3RvcmUuXG4gIC8vXG4gIGFwaS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUodHlwZSwgaWQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zIHx8IHt9KSk7XG4gIH07XG5cblxuICAvLyByZW1vdmVBbGxcbiAgLy8gLS0tLS0tLS0tLS1cblxuICAvLyBEZXN0cm95ZSBhbGwgb2JqZWN0cy4gQ2FuIGJlIGZpbHRlcmVkIGJ5IGEgdHlwZVxuICAvL1xuICBhcGkucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKHR5cGUsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQucmVtb3ZlQWxsKHR5cGUsIG9wdGlvbnMgfHwge30pKTtcbiAgfTtcblxuXG4gIC8vIGRlY29yYXRlIHByb21pc2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgcHJvbWlzZXMgcmV0dXJuZWQgYnkgc3RvcmUuYXBpXG4gIGFwaS5kZWNvcmF0ZVByb21pc2VzID0gZnVuY3Rpb24gZGVjb3JhdGVQcm9taXNlcyhtZXRob2RzKSB7XG4gICAgcmV0dXJuIGV4dGVuZChwcm9taXNlQXBpLCBtZXRob2RzKTtcbiAgfTtcblxuXG5cbiAgLy8gcmVxdWlyZWQgYmFja2VuZCBtZXRob2RzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgaWYgKCFvcHRpb25zLmJhY2tlbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMuYmFja2VuZCBtdXN0IGJlIHBhc3NlZCcpO1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkID0gJ3NhdmUgZmluZCBmaW5kQWxsIHJlbW92ZSByZW1vdmVBbGwnLnNwbGl0KCcgJyk7XG5cbiAgcmVxdWlyZWQuZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG5cbiAgICBpZiAoIW9wdGlvbnMuYmFja2VuZFttZXRob2ROYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvcHRpb25zLmJhY2tlbmQuJyArIG1ldGhvZE5hbWUgKyAnIG11c3QgYmUgcGFzc2VkLicpO1xuICAgIH1cblxuICAgIGJhY2tlbmRbbWV0aG9kTmFtZV0gPSBvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV07XG4gIH0pO1xuXG5cbiAgLy8gUHJpdmF0ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyAvIG5vdCBhbGxvd2VkIGZvciBpZFxuICB2YXIgdmFsaWRJZE9yVHlwZVBhdHRlcm4gPSAvXlteXFwvXSskLztcbiAgdmFyIHZhbGlkSWRPclR5cGVSdWxlcyA9ICcvIG5vdCBhbGxvd2VkJztcblxuICAvL1xuICBmdW5jdGlvbiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSkge1xuICAgIHJldHVybiBleHRlbmQocHJvbWlzZSwgcHJvbWlzZUFwaSk7XG4gIH1cblxuICByZXR1cm4gYXBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVN0b3JlQXBpO1xuIiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307Ly8gUmVtb3RlXG4vLyA9PT09PT09PVxuXG4vLyBDb25uZWN0aW9uIHRvIGEgcmVtb3RlIENvdWNoIERhdGFiYXNlLlxuLy9cbi8vIHN0b3JlIEFQSVxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuLy9cbi8vIG9iamVjdCBsb2FkaW5nIC8gdXBkYXRpbmcgLyBkZWxldGluZ1xuLy9cbi8vICogZmluZCh0eXBlLCBpZClcbi8vICogZmluZEFsbCh0eXBlIClcbi8vICogYWRkKHR5cGUsIG9iamVjdClcbi8vICogc2F2ZSh0eXBlLCBpZCwgb2JqZWN0KVxuLy8gKiB1cGRhdGUodHlwZSwgaWQsIG5ld19wcm9wZXJ0aWVzIClcbi8vICogdXBkYXRlQWxsKCB0eXBlLCBuZXdfcHJvcGVydGllcylcbi8vICogcmVtb3ZlKHR5cGUsIGlkKVxuLy8gKiByZW1vdmVBbGwodHlwZSlcbi8vXG4vLyBjdXN0b20gcmVxdWVzdHNcbi8vXG4vLyAqIHJlcXVlc3QodmlldywgcGFyYW1zKVxuLy8gKiBnZXQodmlldywgcGFyYW1zKVxuLy8gKiBwb3N0KHZpZXcsIHBhcmFtcylcbi8vXG4vLyBzeW5jaHJvbml6YXRpb25cbi8vXG4vLyAqIGNvbm5lY3QoKVxuLy8gKiBkaXNjb25uZWN0KClcbi8vICogcHVsbCgpXG4vLyAqIHB1c2goKVxuLy8gKiBzeW5jKClcbi8vXG4vLyBldmVudCBiaW5kaW5nXG4vL1xuLy8gKiBvbihldmVudCwgY2FsbGJhY2spXG4vL1xuXG52YXIgaG9vZGllU3RvcmVBcGkgPSByZXF1aXJlKCcuL2FwaScpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpO1xudmFyIGdlbmVyYXRlSWQgPSByZXF1aXJlKCcuLi8uLi91dGlscy9nZW5lcmF0ZV9pZCcpO1xudmFyIHJlc29sdmVXaXRoID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvcHJvbWlzZS9yZXNvbHZlX3dpdGgnKTtcblxuLy9cbmZ1bmN0aW9uIGhvb2RpZVJlbW90ZVN0b3JlKGhvb2RpZSwgb3B0aW9ucykge1xuXG4gIHZhciByZW1vdGVTdG9yZSA9IHt9O1xuXG5cbiAgLy8gUmVtb3RlIFN0b3JlIFBlcnNpc3RhbmNlIG1ldGhvZHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGZpbmRcbiAgLy8gLS0tLS0tXG5cbiAgLy8gZmluZCBvbmUgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZVN0b3JlLmZpbmQgPSBmdW5jdGlvbiBmaW5kKHR5cGUsIGlkKSB7XG4gICAgdmFyIHBhdGg7XG5cbiAgICBwYXRoID0gdHlwZSArICcvJyArIGlkO1xuXG4gICAgaWYgKHJlbW90ZS5wcmVmaXgpIHtcbiAgICAgIHBhdGggPSByZW1vdGUucHJlZml4ICsgcGF0aDtcbiAgICB9XG5cbiAgICBwYXRoID0gJy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhdGgpO1xuXG4gICAgcmV0dXJuIHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwYXRoKS50aGVuKHBhcnNlRnJvbVJlbW90ZSk7XG4gIH07XG5cblxuICAvLyBmaW5kQWxsXG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIGZpbmQgYWxsIG9iamVjdHMsIGNhbiBiZSBmaWxldGVyZWQgYnkgYSB0eXBlXG4gIC8vXG4gIHJlbW90ZVN0b3JlLmZpbmRBbGwgPSBmdW5jdGlvbiBmaW5kQWxsKHR5cGUpIHtcbiAgICB2YXIgZW5ka2V5LCBwYXRoLCBzdGFydGtleTtcblxuICAgIHBhdGggPSAnL19hbGxfZG9jcz9pbmNsdWRlX2RvY3M9dHJ1ZSc7XG5cbiAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICBjYXNlICh0eXBlICE9PSB1bmRlZmluZWQpICYmIHJlbW90ZS5wcmVmaXggIT09ICcnOlxuICAgICAgc3RhcnRrZXkgPSByZW1vdGUucHJlZml4ICsgdHlwZSArICcvJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdHlwZSAhPT0gdW5kZWZpbmVkOlxuICAgICAgc3RhcnRrZXkgPSB0eXBlICsgJy8nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSByZW1vdGUucHJlZml4ICE9PSAnJzpcbiAgICAgIHN0YXJ0a2V5ID0gcmVtb3RlLnByZWZpeDtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGFydGtleSA9ICcnO1xuICAgIH1cblxuICAgIGlmIChzdGFydGtleSkge1xuXG4gICAgICAvLyBtYWtlIHN1cmUgdGhhdCBvbmx5IG9iamVjdHMgc3RhcnRpbmcgd2l0aFxuICAgICAgLy8gYHN0YXJ0a2V5YCB3aWxsIGJlIHJldHVybmVkXG4gICAgICBlbmRrZXkgPSBzdGFydGtleS5yZXBsYWNlKC8uJC8sIGZ1bmN0aW9uKGNoYXJzKSB7XG4gICAgICAgIHZhciBjaGFyQ29kZTtcbiAgICAgICAgY2hhckNvZGUgPSBjaGFycy5jaGFyQ29kZUF0KDApO1xuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSArIDEpO1xuICAgICAgfSk7XG4gICAgICBwYXRoID0gJycgKyBwYXRoICsgJyZzdGFydGtleT1cIicgKyAoZW5jb2RlVVJJQ29tcG9uZW50KHN0YXJ0a2V5KSkgKyAnXCImZW5ka2V5PVwiJyArIChlbmNvZGVVUklDb21wb25lbnQoZW5ka2V5KSkgKyAnXCInO1xuICAgIH1cblxuICAgIHJldHVybiByZW1vdGUucmVxdWVzdCgnR0VUJywgcGF0aCkudGhlbihtYXBEb2NzRnJvbUZpbmRBbGwpLnRoZW4ocGFyc2VBbGxGcm9tUmVtb3RlKTtcbiAgfTtcblxuXG4gIC8vIHNhdmVcbiAgLy8gLS0tLS0tXG5cbiAgLy8gc2F2ZSBhIG5ldyBvYmplY3QuIElmIGl0IGV4aXN0ZWQgYmVmb3JlLCBhbGwgcHJvcGVydGllc1xuICAvLyB3aWxsIGJlIG92ZXJ3cml0dGVuXG4gIC8vXG4gIHJlbW90ZVN0b3JlLnNhdmUgPSBmdW5jdGlvbiBzYXZlKG9iamVjdCkge1xuICAgIHZhciBwYXRoO1xuXG4gICAgaWYgKCFvYmplY3QuaWQpIHtcbiAgICAgIG9iamVjdC5pZCA9IGdlbmVyYXRlSWQoKTtcbiAgICB9XG5cbiAgICBvYmplY3QgPSBwYXJzZUZvclJlbW90ZShvYmplY3QpO1xuICAgIHBhdGggPSAnLycgKyBlbmNvZGVVUklDb21wb25lbnQob2JqZWN0Ll9pZCk7XG4gICAgcmV0dXJuIHJlbW90ZS5yZXF1ZXN0KCdQVVQnLCBwYXRoLCB7XG4gICAgICBkYXRhOiBvYmplY3RcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHJlbW92ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyByZW1vdmUgb25lIG9iamVjdFxuICAvL1xuICByZW1vdGVTdG9yZS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUodHlwZSwgaWQpIHtcbiAgICByZXR1cm4gcmVtb3RlLnVwZGF0ZSh0eXBlLCBpZCwge1xuICAgICAgX2RlbGV0ZWQ6IHRydWVcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHJlbW92ZUFsbFxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyByZW1vdmUgYWxsIG9iamVjdHMsIGNhbiBiZSBmaWx0ZXJlZCBieSB0eXBlXG4gIC8vXG4gIHJlbW90ZVN0b3JlLnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHJlbW92ZUFsbCh0eXBlKSB7XG4gICAgcmV0dXJuIHJlbW90ZS51cGRhdGVBbGwodHlwZSwge1xuICAgICAgX2RlbGV0ZWQ6IHRydWVcbiAgICB9KTtcbiAgfTtcblxuXG4gIHZhciByZW1vdGUgPSBob29kaWVTdG9yZUFwaShob29kaWUsIHtcblxuICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcblxuICAgIGJhY2tlbmQ6IHtcbiAgICAgIHNhdmU6IHJlbW90ZVN0b3JlLnNhdmUsXG4gICAgICBmaW5kOiByZW1vdGVTdG9yZS5maW5kLFxuICAgICAgZmluZEFsbDogcmVtb3RlU3RvcmUuZmluZEFsbCxcbiAgICAgIHJlbW92ZTogcmVtb3RlU3RvcmUucmVtb3ZlLFxuICAgICAgcmVtb3ZlQWxsOiByZW1vdGVTdG9yZS5yZW1vdmVBbGxcbiAgICB9XG4gIH0pO1xuXG5cblxuXG5cbiAgLy8gcHJvcGVydGllc1xuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBuYW1lXG5cbiAgLy8gdGhlIG5hbWUgb2YgdGhlIFJlbW90ZSBpcyB0aGUgbmFtZSBvZiB0aGVcbiAgLy8gQ291Y2hEQiBkYXRhYmFzZSBhbmQgaXMgYWxzbyB1c2VkIHRvIHByZWZpeFxuICAvLyB0cmlnZ2VyZWQgZXZlbnRzXG4gIC8vXG4gIHZhciByZW1vdGVOYW1lID0gbnVsbDtcblxuXG4gIC8vIHN5bmNcblxuICAvLyBpZiBzZXQgdG8gdHJ1ZSwgdXBkYXRlcyB3aWxsIGJlIGNvbnRpbnVvdXNseSBwdWxsZWRcbiAgLy8gYW5kIHB1c2hlZC4gQWx0ZXJuYXRpdmVseSwgYHN5bmNgIGNhbiBiZSBzZXQgdG9cbiAgLy8gYHB1bGw6IHRydWVgIG9yIGBwdXNoOiB0cnVlYC5cbiAgLy9cbiAgcmVtb3RlLmNvbm5lY3RlZCA9IGZhbHNlO1xuXG5cbiAgLy8gcHJlZml4XG5cbiAgLy8gcHJlZml4IGZvciBkb2NzIGluIGEgQ291Y2hEQiBkYXRhYmFzZSwgZS5nLiBhbGwgZG9jc1xuICAvLyBpbiBwdWJsaWMgdXNlciBzdG9yZXMgYXJlIHByZWZpeGVkIGJ5ICckcHVibGljLydcbiAgLy9cbiAgcmVtb3RlLnByZWZpeCA9ICcnO1xuICB2YXIgcmVtb3RlUHJlZml4UGF0dGVybiA9IG5ldyBSZWdFeHAoJ14nKTtcblxuXG4gIC8vIGRlZmF1bHRzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvL1xuICBpZiAob3B0aW9ucy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdGVOYW1lID0gb3B0aW9ucy5uYW1lO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMucHJlZml4ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdGUucHJlZml4ID0gb3B0aW9ucy5wcmVmaXg7XG4gICAgcmVtb3RlUHJlZml4UGF0dGVybiA9IG5ldyBSZWdFeHAoJ14nICsgcmVtb3RlLnByZWZpeCk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5iYXNlVXJsICE9PSBudWxsKSB7XG4gICAgcmVtb3RlLmJhc2VVcmwgPSBvcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuXG4gIC8vIHJlcXVlc3RcbiAgLy8gLS0tLS0tLS0tXG5cbiAgLy8gd3JhcHBlciBmb3IgaG9vZGllJ3MgcmVxdWVzdCwgd2l0aCBzb21lIHN0b3JlIHNwZWNpZmljIGRlZmF1bHRzXG4gIC8vIGFuZCBhIHByZWZpeGVkIHBhdGhcbiAgLy9cbiAgcmVtb3RlLnJlcXVlc3QgPSBmdW5jdGlvbiByZW1vdGVSZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmIChyZW1vdGVOYW1lKSB7XG4gICAgICBwYXRoID0gJy8nICsgKGVuY29kZVVSSUNvbXBvbmVudChyZW1vdGVOYW1lKSkgKyBwYXRoO1xuICAgIH1cblxuICAgIGlmIChyZW1vdGUuYmFzZVVybCkge1xuICAgICAgcGF0aCA9ICcnICsgcmVtb3RlLmJhc2VVcmwgKyBwYXRoO1xuICAgIH1cblxuICAgIG9wdGlvbnMuY29udGVudFR5cGUgPSBvcHRpb25zLmNvbnRlbnRUeXBlIHx8ICdhcHBsaWNhdGlvbi9qc29uJztcblxuICAgIGlmICh0eXBlID09PSAnUE9TVCcgfHwgdHlwZSA9PT0gJ1BVVCcpIHtcbiAgICAgIG9wdGlvbnMuZGF0YVR5cGUgPSBvcHRpb25zLmRhdGFUeXBlIHx8ICdqc29uJztcbiAgICAgIG9wdGlvbnMucHJvY2Vzc0RhdGEgPSBvcHRpb25zLnByb2Nlc3NEYXRhIHx8IGZhbHNlO1xuICAgICAgb3B0aW9ucy5kYXRhID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5kYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGhvb2RpZS5yZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpO1xuICB9O1xuXG5cbiAgLy8gaXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBkZXRlcm1pbmUgYmV0d2VlbiBhIGtub3duIGFuZCBhIG5ldyBvYmplY3RcbiAgLy9cbiAgcmVtb3RlLmlzS25vd25PYmplY3QgPSBmdW5jdGlvbiBpc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuXG4gICAgaWYgKGtub3duT2JqZWN0c1trZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBrbm93bk9iamVjdHNba2V5XTtcbiAgICB9XG4gIH07XG5cblxuICAvLyBtYXJrQXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZGV0ZXJtaW5lIGJldHdlZW4gYSBrbm93biBhbmQgYSBuZXcgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZS5tYXJrQXNLbm93bk9iamVjdCA9IGZ1bmN0aW9uIG1hcmtBc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuICAgIGtub3duT2JqZWN0c1trZXldID0gMTtcbiAgICByZXR1cm4ga25vd25PYmplY3RzW2tleV07XG4gIH07XG5cblxuICAvLyBzeW5jaHJvbml6YXRpb25cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBDb25uZWN0XG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIHN0YXJ0IHN5bmNpbmcuIGByZW1vdGUuYm9vdHN0cmFwKClgIHdpbGwgYXV0b21hdGljYWxseSBzdGFydFxuICAvLyBwdWxsaW5nIHdoZW4gYHJlbW90ZS5jb25uZWN0ZWRgIHJlbWFpbnMgdHJ1ZS5cbiAgLy9cbiAgcmVtb3RlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgcmVtb3RlTmFtZSA9IG5hbWU7XG4gICAgfVxuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIHJlbW90ZS50cmlnZ2VyKCdjb25uZWN0Jyk7XG4gICAgcmV0dXJuIHJlbW90ZS5ib290c3RyYXAoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmVtb3RlLnB1c2goKTtcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIERpc2Nvbm5lY3RcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gc3RvcCBzeW5jaW5nIGNoYW5nZXMgZnJvbSByZW1vdGUgc3RvcmVcbiAgLy9cbiAgcmVtb3RlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignZGlzY29ubmVjdCcpOyAvLyBUT0RPOiBzcGVjIHRoYXRcbiAgICBpZiAocHVsbFJlcXVlc3QpIHtcbiAgICAgIHB1bGxSZXF1ZXN0LmFib3J0KCk7XG4gICAgfVxuXG4gICAgaWYgKHB1c2hSZXF1ZXN0KSB7XG4gICAgICBwdXNoUmVxdWVzdC5hYm9ydCgpO1xuICAgIH1cblxuICB9O1xuXG5cbiAgLy8gaXNDb25uZWN0ZWRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vXG4gIHJlbW90ZS5pc0Nvbm5lY3RlZCA9IGZ1bmN0aW9uIGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiByZW1vdGUuY29ubmVjdGVkO1xuICB9O1xuXG5cbiAgLy8gZ2V0U2luY2VOclxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyByZXR1cm5zIHRoZSBzZXF1ZW5jZSBudW1iZXIgZnJvbSB3aWNoIHRvIHN0YXJ0IHRvIGZpbmQgY2hhbmdlcyBpbiBwdWxsXG4gIC8vXG4gIHZhciBzaW5jZSA9IG9wdGlvbnMuc2luY2UgfHwgMDsgLy8gVE9ETzogc3BlYyB0aGF0IVxuICByZW1vdGUuZ2V0U2luY2VOciA9IGZ1bmN0aW9uIGdldFNpbmNlTnIoKSB7XG4gICAgaWYgKHR5cGVvZiBzaW5jZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHNpbmNlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpbmNlO1xuICB9O1xuXG5cbiAgLy8gYm9vdHN0cmFwXG4gIC8vIC0tLS0tLS0tLS0tXG5cbiAgLy8gaW5pdGFsIHB1bGwgb2YgZGF0YSBvZiB0aGUgcmVtb3RlIHN0b3JlLiBCeSBkZWZhdWx0LCB3ZSBwdWxsIGFsbFxuICAvLyBjaGFuZ2VzIHNpbmNlIHRoZSBiZWdpbm5pbmcsIGJ1dCB0aGlzIGJlaGF2aW9yIG1pZ2h0IGJlIGFkanVzdGVkLFxuICAvLyBlLmcgZm9yIGEgZmlsdGVyZWQgYm9vdHN0cmFwLlxuICAvL1xuICB2YXIgaXNCb290c3RyYXBwaW5nID0gZmFsc2U7XG4gIHJlbW90ZS5ib290c3RyYXAgPSBmdW5jdGlvbiBib290c3RyYXAoKSB7XG4gICAgaXNCb290c3RyYXBwaW5nID0gdHJ1ZTtcbiAgICByZW1vdGUudHJpZ2dlcignYm9vdHN0cmFwOnN0YXJ0Jyk7XG4gICAgcmV0dXJuIHJlbW90ZS5wdWxsKCkuZG9uZShoYW5kbGVCb290c3RyYXBTdWNjZXNzKS5mYWlsKGhhbmRsZUJvb3RzdHJhcEVycm9yKTtcbiAgfTtcblxuXG4gIC8vIHB1bGwgY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGEuay5hLiBtYWtlIGEgR0VUIHJlcXVlc3QgdG8gQ291Y2hEQidzIGBfY2hhbmdlc2AgZmVlZC5cbiAgLy8gV2UgY3VycmVudGx5IG1ha2UgbG9uZyBwb2xsIHJlcXVlc3RzLCB0aGF0IHdlIG1hbnVhbGx5IGFib3J0XG4gIC8vIGFuZCByZXN0YXJ0IGVhY2ggMjUgc2Vjb25kcy5cbiAgLy9cbiAgdmFyIHB1bGxSZXF1ZXN0LCBwdWxsUmVxdWVzdFRpbWVvdXQ7XG4gIHJlbW90ZS5wdWxsID0gZnVuY3Rpb24gcHVsbCgpIHtcbiAgICBwdWxsUmVxdWVzdCA9IHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwdWxsVXJsKCkpO1xuXG4gICAgaWYgKHJlbW90ZS5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICBnbG9iYWwuY2xlYXJUaW1lb3V0KHB1bGxSZXF1ZXN0VGltZW91dCk7XG4gICAgICBwdWxsUmVxdWVzdFRpbWVvdXQgPSBnbG9iYWwuc2V0VGltZW91dChyZXN0YXJ0UHVsbFJlcXVlc3QsIDI1MDAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHVsbFJlcXVlc3QuZG9uZShoYW5kbGVQdWxsU3VjY2VzcykuZmFpbChoYW5kbGVQdWxsRXJyb3IpO1xuICB9O1xuXG5cbiAgLy8gcHVzaCBjaGFuZ2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUHVzaCBvYmplY3RzIHRvIHJlbW90ZSBzdG9yZSB1c2luZyB0aGUgYF9idWxrX2RvY3NgIEFQSS5cbiAgLy9cbiAgdmFyIHB1c2hSZXF1ZXN0O1xuICByZW1vdGUucHVzaCA9IGZ1bmN0aW9uIHB1c2gob2JqZWN0cykge1xuICAgIHZhciBvYmplY3QsIG9iamVjdHNGb3JSZW1vdGUsIF9pLCBfbGVuO1xuXG4gICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgIG9iamVjdHMgPSBkZWZhdWx0T2JqZWN0c1RvUHVzaCgpO1xuICAgIH1cblxuICAgIGlmIChvYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHJlc29sdmVXaXRoKFtdKTtcbiAgICB9XG5cbiAgICBvYmplY3RzRm9yUmVtb3RlID0gW107XG5cbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IG9iamVjdHMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcblxuICAgICAgLy8gZG9uJ3QgbWVzcyB3aXRoIG9yaWdpbmFsIG9iamVjdHNcbiAgICAgIG9iamVjdCA9IGV4dGVuZCh0cnVlLCB7fSwgb2JqZWN0c1tfaV0pO1xuICAgICAgYWRkUmV2aXNpb25UbyhvYmplY3QpO1xuICAgICAgb2JqZWN0ID0gcGFyc2VGb3JSZW1vdGUob2JqZWN0KTtcbiAgICAgIG9iamVjdHNGb3JSZW1vdGUucHVzaChvYmplY3QpO1xuICAgIH1cbiAgICBwdXNoUmVxdWVzdCA9IHJlbW90ZS5yZXF1ZXN0KCdQT1NUJywgJy9fYnVsa19kb2NzJywge1xuICAgICAgZGF0YToge1xuICAgICAgICBkb2NzOiBvYmplY3RzRm9yUmVtb3RlLFxuICAgICAgICBuZXdfZWRpdHM6IGZhbHNlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwdXNoUmVxdWVzdC5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlbW90ZS50cmlnZ2VyKCdwdXNoJywgb2JqZWN0c1tpXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHB1c2hSZXF1ZXN0O1xuICB9O1xuXG4gIC8vIHN5bmMgY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHB1c2ggb2JqZWN0cywgdGhlbiBwdWxsIHVwZGF0ZXMuXG4gIC8vXG4gIHJlbW90ZS5zeW5jID0gZnVuY3Rpb24gc3luYyhvYmplY3RzKSB7XG4gICAgcmV0dXJuIHJlbW90ZS5wdXNoKG9iamVjdHMpLnRoZW4ocmVtb3RlLnB1bGwpO1xuICB9O1xuXG4gIC8vXG4gIC8vIFByaXZhdGVcbiAgLy8gLS0tLS0tLS0tXG4gIC8vXG5cbiAgLy8gaW4gb3JkZXIgdG8gZGlmZmVyZW50aWF0ZSB3aGV0aGVyIGFuIG9iamVjdCBmcm9tIHJlbW90ZSBzaG91bGQgdHJpZ2dlciBhICduZXcnXG4gIC8vIG9yIGFuICd1cGRhdGUnIGV2ZW50LCB3ZSBzdG9yZSBhIGhhc2ggb2Yga25vd24gb2JqZWN0c1xuICB2YXIga25vd25PYmplY3RzID0ge307XG5cblxuICAvLyB2YWxpZCBDb3VjaERCIGRvYyBhdHRyaWJ1dGVzIHN0YXJ0aW5nIHdpdGggYW4gdW5kZXJzY29yZVxuICAvL1xuICB2YXIgdmFsaWRTcGVjaWFsQXR0cmlidXRlcyA9IFsnX2lkJywgJ19yZXYnLCAnX2RlbGV0ZWQnLCAnX3JldmlzaW9ucycsICdfYXR0YWNobWVudHMnXTtcblxuXG4gIC8vIGRlZmF1bHQgb2JqZWN0cyB0byBwdXNoXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gd2hlbiBwdXNoZWQgd2l0aG91dCBwYXNzaW5nIGFueSBvYmplY3RzLCB0aGUgb2JqZWN0cyByZXR1cm5lZCBmcm9tXG4gIC8vIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGFzc2VkLiBJdCBjYW4gYmUgb3ZlcndyaXR0ZW4gYnkgcGFzc2luZyBhblxuICAvLyBhcnJheSBvZiBvYmplY3RzIG9yIGEgZnVuY3Rpb24gYXMgYG9wdGlvbnMub2JqZWN0c2BcbiAgLy9cbiAgdmFyIGRlZmF1bHRPYmplY3RzVG9QdXNoID0gZnVuY3Rpb24gZGVmYXVsdE9iamVjdHNUb1B1c2goKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfTtcbiAgaWYgKG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2gpIHtcbiAgICBpZiAoJC5pc0FycmF5KG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2gpKSB7XG4gICAgICBkZWZhdWx0T2JqZWN0c1RvUHVzaCA9IGZ1bmN0aW9uIGRlZmF1bHRPYmplY3RzVG9QdXNoKCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaDtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlZmF1bHRPYmplY3RzVG9QdXNoID0gb3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaDtcbiAgICB9XG4gIH1cblxuXG4gIC8vIHNldFNpbmNlTnJcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gc2V0cyB0aGUgc2VxdWVuY2UgbnVtYmVyIGZyb20gd2ljaCB0byBzdGFydCB0byBmaW5kIGNoYW5nZXMgaW4gcHVsbC5cbiAgLy8gSWYgcmVtb3RlIHN0b3JlIHdhcyBpbml0aWFsaXplZCB3aXRoIHNpbmNlIDogZnVuY3Rpb24obnIpIHsgLi4uIH0sXG4gIC8vIGNhbGwgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIHNlcSBwYXNzZWQuIE90aGVyd2lzZSBzaW1wbHkgc2V0IHRoZSBzZXFcbiAgLy8gbnVtYmVyIGFuZCByZXR1cm4gaXQuXG4gIC8vXG4gIGZ1bmN0aW9uIHNldFNpbmNlTnIoc2VxKSB7XG4gICAgaWYgKHR5cGVvZiBzaW5jZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHNpbmNlKHNlcSk7XG4gICAgfVxuXG4gICAgc2luY2UgPSBzZXE7XG4gICAgcmV0dXJuIHNpbmNlO1xuICB9XG5cblxuICAvLyBQYXJzZSBmb3IgcmVtb3RlXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHBhcnNlIG9iamVjdCBmb3IgcmVtb3RlIHN0b3JhZ2UuIEFsbCBwcm9wZXJ0aWVzIHN0YXJ0aW5nIHdpdGggYW5cbiAgLy8gYHVuZGVyc2NvcmVgIGRvIG5vdCBnZXQgc3luY2hyb25pemVkIGRlc3BpdGUgdGhlIHNwZWNpYWwgcHJvcGVydGllc1xuICAvLyBgX2lkYCwgYF9yZXZgIGFuZCBgX2RlbGV0ZWRgIChzZWUgYWJvdmUpXG4gIC8vXG4gIC8vIEFsc28gYGlkYCBnZXRzIHJlcGxhY2VkIHdpdGggYF9pZGAgd2hpY2ggY29uc2lzdHMgb2YgdHlwZSAmIGlkXG4gIC8vXG4gIGZ1bmN0aW9uIHBhcnNlRm9yUmVtb3RlKG9iamVjdCkge1xuICAgIHZhciBhdHRyLCBwcm9wZXJ0aWVzO1xuICAgIHByb3BlcnRpZXMgPSBleHRlbmQoe30sIG9iamVjdCk7XG5cbiAgICBmb3IgKGF0dHIgaW4gcHJvcGVydGllcykge1xuICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkoYXR0cikpIHtcbiAgICAgICAgaWYgKHZhbGlkU3BlY2lhbEF0dHJpYnV0ZXMuaW5kZXhPZihhdHRyKSAhPT0gLTEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIS9eXy8udGVzdChhdHRyKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBwcm9wZXJ0aWVzW2F0dHJdO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHByZXBhcmUgQ291Y2hEQiBpZFxuICAgIHByb3BlcnRpZXMuX2lkID0gJycgKyBwcm9wZXJ0aWVzLnR5cGUgKyAnLycgKyBwcm9wZXJ0aWVzLmlkO1xuICAgIGlmIChyZW1vdGUucHJlZml4KSB7XG4gICAgICBwcm9wZXJ0aWVzLl9pZCA9ICcnICsgcmVtb3RlLnByZWZpeCArIHByb3BlcnRpZXMuX2lkO1xuICAgIH1cbiAgICBkZWxldGUgcHJvcGVydGllcy5pZDtcbiAgICByZXR1cm4gcHJvcGVydGllcztcbiAgfVxuXG5cbiAgLy8gIyMjIHBhcnNlRnJvbVJlbW90ZVxuXG4gIC8vIG5vcm1hbGl6ZSBvYmplY3RzIGNvbWluZyBmcm9tIHJlbW90ZVxuICAvL1xuICAvLyByZW5hbWVzIGBfaWRgIGF0dHJpYnV0ZSB0byBgaWRgIGFuZCByZW1vdmVzIHRoZSB0eXBlIGZyb20gdGhlIGlkLFxuICAvLyBlLmcuIGB0eXBlLzEyM2AgLT4gYDEyM2BcbiAgLy9cbiAgZnVuY3Rpb24gcGFyc2VGcm9tUmVtb3RlKG9iamVjdCkge1xuICAgIHZhciBpZCwgbWF0Y2hlcztcblxuICAgIC8vIGhhbmRsZSBpZCBhbmQgdHlwZVxuICAgIGlkID0gb2JqZWN0Ll9pZCB8fCBvYmplY3QuaWQ7XG4gICAgZGVsZXRlIG9iamVjdC5faWQ7XG5cbiAgICBpZiAocmVtb3RlLnByZWZpeCkge1xuICAgICAgaWQgPSBpZC5yZXBsYWNlKHJlbW90ZVByZWZpeFBhdHRlcm4sICcnKTtcbiAgICB9XG5cbiAgICAvLyB0dXJuIGRvYy8xMjMgaW50byB0eXBlID0gZG9jICYgaWQgPSAxMjNcbiAgICAvLyBOT1RFOiB3ZSBkb24ndCB1c2UgYSBzaW1wbGUgaWQuc3BsaXQoL1xcLy8pIGhlcmUsXG4gICAgLy8gYXMgaW4gc29tZSBjYXNlcyBJRHMgbWlnaHQgY29udGFpbiAnLycsIHRvb1xuICAgIC8vXG4gICAgbWF0Y2hlcyA9IGlkLm1hdGNoKC8oW15cXC9dKylcXC8oLiopLyk7XG4gICAgb2JqZWN0LnR5cGUgPSBtYXRjaGVzWzFdLCBvYmplY3QuaWQgPSBtYXRjaGVzWzJdO1xuXG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlQWxsRnJvbVJlbW90ZShvYmplY3RzKSB7XG4gICAgcmV0dXJuIG9iamVjdHMubWFwKHBhcnNlRnJvbVJlbW90ZSk7XG4gIH1cblxuXG4gIC8vICMjIyBfYWRkUmV2aXNpb25Ub1xuXG4gIC8vIGV4dGVuZHMgcGFzc2VkIG9iamVjdCB3aXRoIGEgX3JldiBwcm9wZXJ0eVxuICAvL1xuICBmdW5jdGlvbiBhZGRSZXZpc2lvblRvKGF0dHJpYnV0ZXMpIHtcbiAgICB2YXIgY3VycmVudFJldklkLCBjdXJyZW50UmV2TnIsIG5ld1JldmlzaW9uSWQsIHBhcnRzO1xuICAgIHRyeSB7XG4gICAgICBwYXJ0cyA9IGF0dHJpYnV0ZXMuX3Jldi5zcGxpdCgvLS8pLCBjdXJyZW50UmV2TnIgPSBwYXJ0c1swXSwgY3VycmVudFJldklkID0gcGFydHNbMV07XG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7fVxuICAgIGN1cnJlbnRSZXZOciA9IHBhcnNlSW50KGN1cnJlbnRSZXZOciwgMTApIHx8IDA7XG4gICAgbmV3UmV2aXNpb25JZCA9IGdlbmVyYXRlTmV3UmV2aXNpb25JZCgpO1xuXG4gICAgLy8gbG9jYWwgY2hhbmdlcyBhcmUgbm90IG1lYW50IHRvIGJlIHJlcGxpY2F0ZWQgb3V0c2lkZSBvZiB0aGVcbiAgICAvLyB1c2VycyBkYXRhYmFzZSwgdGhlcmVmb3JlIHRoZSBgLWxvY2FsYCBzdWZmaXguXG4gICAgaWYgKGF0dHJpYnV0ZXMuXyRsb2NhbCkge1xuICAgICAgbmV3UmV2aXNpb25JZCArPSAnLWxvY2FsJztcbiAgICB9XG5cbiAgICBhdHRyaWJ1dGVzLl9yZXYgPSAnJyArIChjdXJyZW50UmV2TnIgKyAxKSArICctJyArIG5ld1JldmlzaW9uSWQ7XG4gICAgYXR0cmlidXRlcy5fcmV2aXNpb25zID0ge1xuICAgICAgc3RhcnQ6IDEsXG4gICAgICBpZHM6IFtuZXdSZXZpc2lvbklkXVxuICAgIH07XG5cbiAgICBpZiAoY3VycmVudFJldklkKSB7XG4gICAgICBhdHRyaWJ1dGVzLl9yZXZpc2lvbnMuc3RhcnQgKz0gY3VycmVudFJldk5yO1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZXMuX3JldmlzaW9ucy5pZHMucHVzaChjdXJyZW50UmV2SWQpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIGdlbmVyYXRlIG5ldyByZXZpc2lvbiBpZFxuXG4gIC8vXG4gIGZ1bmN0aW9uIGdlbmVyYXRlTmV3UmV2aXNpb25JZCgpIHtcbiAgICByZXR1cm4gZ2VuZXJhdGVJZCg5KTtcbiAgfVxuXG5cbiAgLy8gIyMjIG1hcCBkb2NzIGZyb20gZmluZEFsbFxuXG4gIC8vXG4gIGZ1bmN0aW9uIG1hcERvY3NGcm9tRmluZEFsbChyZXNwb25zZSkge1xuICAgIHJldHVybiByZXNwb25zZS5yb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiByb3cuZG9jO1xuICAgIH0pO1xuICB9XG5cblxuICAvLyAjIyMgcHVsbCB1cmxcblxuICAvLyBEZXBlbmRpbmcgb24gd2hldGhlciByZW1vdGUgaXMgY29ubmVjdGVkICg9IHB1bGxpbmcgY2hhbmdlcyBjb250aW51b3VzbHkpXG4gIC8vIHJldHVybiBhIGxvbmdwb2xsIFVSTCBvciBub3QuIElmIGl0IGlzIGEgYmVnaW5uaW5nIGJvb3RzdHJhcCByZXF1ZXN0LCBkb1xuICAvLyBub3QgcmV0dXJuIGEgbG9uZ3BvbGwgVVJMLCBhcyB3ZSB3YW50IGl0IHRvIGZpbmlzaCByaWdodCBhd2F5LCBldmVuIGlmIHRoZXJlXG4gIC8vIGFyZSBubyBjaGFuZ2VzIG9uIHJlbW90ZS5cbiAgLy9cbiAgZnVuY3Rpb24gcHVsbFVybCgpIHtcbiAgICB2YXIgc2luY2U7XG4gICAgc2luY2UgPSByZW1vdGUuZ2V0U2luY2VOcigpO1xuICAgIGlmIChyZW1vdGUuaXNDb25uZWN0ZWQoKSAmJiAhaXNCb290c3RyYXBwaW5nKSB7XG4gICAgICByZXR1cm4gJy9fY2hhbmdlcz9pbmNsdWRlX2RvY3M9dHJ1ZSZzaW5jZT0nICsgc2luY2UgKyAnJmhlYXJ0YmVhdD0xMDAwMCZmZWVkPWxvbmdwb2xsJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcvX2NoYW5nZXM/aW5jbHVkZV9kb2NzPXRydWUmc2luY2U9JyArIHNpbmNlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIHJlc3RhcnQgcHVsbCByZXF1ZXN0XG5cbiAgLy8gcmVxdWVzdCBnZXRzIHJlc3RhcnRlZCBhdXRvbWF0aWNjYWxseVxuICAvLyB3aGVuIGFib3J0ZWQgKHNlZSBoYW5kbGVQdWxsRXJyb3IpXG4gIGZ1bmN0aW9uIHJlc3RhcnRQdWxsUmVxdWVzdCgpIHtcbiAgICBpZiAocHVsbFJlcXVlc3QpIHtcbiAgICAgIHB1bGxSZXF1ZXN0LmFib3J0KCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcHVsbCBzdWNjZXNzIGhhbmRsZXJcblxuICAvLyByZXF1ZXN0IGdldHMgcmVzdGFydGVkIGF1dG9tYXRpY2NhbGx5XG4gIC8vIHdoZW4gYWJvcnRlZCAoc2VlIGhhbmRsZVB1bGxFcnJvcilcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUHVsbFN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICBzZXRTaW5jZU5yKHJlc3BvbnNlLmxhc3Rfc2VxKTtcbiAgICBoYW5kbGVQdWxsUmVzdWx0cyhyZXNwb25zZS5yZXN1bHRzKTtcbiAgICBpZiAocmVtb3RlLmlzQ29ubmVjdGVkKCkpIHtcbiAgICAgIHJldHVybiByZW1vdGUucHVsbCgpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIHB1bGwgZXJyb3IgaGFuZGxlclxuXG4gIC8vIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UsIHRyaWdnZXIgZXZlbnQsXG4gIC8vIHRoZW4gY2hlY2sgZm9yIGFub3RoZXIgY2hhbmdlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZVB1bGxFcnJvcih4aHIsIGVycm9yKSB7XG4gICAgaWYgKCFyZW1vdGUuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAoeGhyLnN0YXR1cykge1xuICAgICAgLy8gU2Vzc2lvbiBpcyBpbnZhbGlkLiBVc2VyIGlzIHN0aWxsIGxvZ2luLCBidXQgbmVlZHMgdG8gcmVhdXRoZW50aWNhdGVcbiAgICAgIC8vIGJlZm9yZSBzeW5jIGNhbiBiZSBjb250aW51ZWRcbiAgICBjYXNlIDQwMTpcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdlcnJvcjp1bmF1dGhlbnRpY2F0ZWQnLCBlcnJvcik7XG4gICAgICByZXR1cm4gcmVtb3RlLmRpc2Nvbm5lY3QoKTtcblxuICAgICAgLy8gdGhlIDQwNCBjb21lcywgd2hlbiB0aGUgcmVxdWVzdGVkIERCIGhhcyBiZWVuIHJlbW92ZWRcbiAgICAgIC8vIG9yIGRvZXMgbm90IGV4aXN0IHlldC5cbiAgICAgIC8vXG4gICAgICAvLyBCVVQ6IGl0IG1pZ2h0IGFsc28gaGFwcGVuIHRoYXQgdGhlIGJhY2tncm91bmQgd29ya2VycyBkaWRcbiAgICAgIC8vICAgICAgbm90IGNyZWF0ZSBhIHBlbmRpbmcgZGF0YWJhc2UgeWV0LiBUaGVyZWZvcmUsXG4gICAgICAvLyAgICAgIHdlIHRyeSBpdCBhZ2FpbiBpbiAzIHNlY29uZHNcbiAgICAgIC8vXG4gICAgICAvLyBUT0RPOiByZXZpZXcgLyByZXRoaW5rIHRoYXQuXG4gICAgICAvL1xuICAgIGNhc2UgNDA0OlxuICAgICAgcmV0dXJuIGdsb2JhbC5zZXRUaW1lb3V0KHJlbW90ZS5wdWxsLCAzMDAwKTtcblxuICAgIGNhc2UgNTAwOlxuICAgICAgLy9cbiAgICAgIC8vIFBsZWFzZSBzZXJ2ZXIsIGRvbid0IGdpdmUgdXMgdGhlc2UuIEF0IGxlYXN0IG5vdCBwZXJzaXN0ZW50bHlcbiAgICAgIC8vXG4gICAgICByZW1vdGUudHJpZ2dlcignZXJyb3I6c2VydmVyJywgZXJyb3IpO1xuICAgICAgZ2xvYmFsLnNldFRpbWVvdXQocmVtb3RlLnB1bGwsIDMwMDApO1xuICAgICAgcmV0dXJuIGhvb2RpZS5jaGVja0Nvbm5lY3Rpb24oKTtcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gdXN1YWxseSBhIDAsIHdoaWNoIHN0YW5kcyBmb3IgdGltZW91dCBvciBzZXJ2ZXIgbm90IHJlYWNoYWJsZS5cbiAgICAgIGlmICh4aHIuc3RhdHVzVGV4dCA9PT0gJ2Fib3J0Jykge1xuICAgICAgICAvLyBtYW51YWwgYWJvcnQgYWZ0ZXIgMjVzZWMuIHJlc3RhcnQgcHVsbGluZyBjaGFuZ2VzIGRpcmVjdGx5IHdoZW4gY29ubmVjdGVkXG4gICAgICAgIHJldHVybiByZW1vdGUucHVsbCgpO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICAvLyBvb3BzLiBUaGlzIG1pZ2h0IGJlIGNhdXNlZCBieSBhbiB1bnJlYWNoYWJsZSBzZXJ2ZXIuXG4gICAgICAgIC8vIE9yIHRoZSBzZXJ2ZXIgY2FuY2VsbGVkIGl0IGZvciB3aGF0IGV2ZXIgcmVhc29uLCBlLmcuXG4gICAgICAgIC8vIGhlcm9rdSBraWxscyB0aGUgcmVxdWVzdCBhZnRlciB+MzBzLlxuICAgICAgICAvLyB3ZSdsbCB0cnkgYWdhaW4gYWZ0ZXIgYSAzcyB0aW1lb3V0XG4gICAgICAgIC8vXG4gICAgICAgIGdsb2JhbC5zZXRUaW1lb3V0KHJlbW90ZS5wdWxsLCAzMDAwKTtcbiAgICAgICAgcmV0dXJuIGhvb2RpZS5jaGVja0Nvbm5lY3Rpb24oKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8vICMjIyBoYW5kbGUgaW5pdGlhbCBib290c3RyYXBwaW5nIGZyb20gcmVtb3RlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZUJvb3RzdHJhcFN1Y2Nlc3MoKSB7XG4gICAgaXNCb290c3RyYXBwaW5nID0gZmFsc2U7XG4gICAgcmVtb3RlLnRyaWdnZXIoJ2Jvb3RzdHJhcDplbmQnKTtcbiAgfVxuXG4gIC8vICMjIyBoYW5kbGUgZXJyb3Igb2YgaW5pdGlhbCBib290c3RyYXBwaW5nIGZyb20gcmVtb3RlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZUJvb3RzdHJhcEVycm9yKGVycm9yKSB7XG4gICAgaXNCb290c3RyYXBwaW5nID0gZmFsc2U7XG4gICAgcmVtb3RlLnRyaWdnZXIoJ2Jvb3RzdHJhcDplcnJvcicsIGVycm9yKTtcbiAgfVxuXG4gIC8vICMjIyBoYW5kbGUgY2hhbmdlcyBmcm9tIHJlbW90ZVxuICAvL1xuICBmdW5jdGlvbiBoYW5kbGVQdWxsUmVzdWx0cyhjaGFuZ2VzKSB7XG4gICAgdmFyIGRvYywgZXZlbnQsIG9iamVjdCwgX2ksIF9sZW47XG5cbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IGNoYW5nZXMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIGRvYyA9IGNoYW5nZXNbX2ldLmRvYztcblxuICAgICAgaWYgKHJlbW90ZS5wcmVmaXggJiYgZG9jLl9pZC5pbmRleE9mKHJlbW90ZS5wcmVmaXgpICE9PSAwKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBvYmplY3QgPSBwYXJzZUZyb21SZW1vdGUoZG9jKTtcblxuICAgICAgaWYgKG9iamVjdC5fZGVsZXRlZCkge1xuICAgICAgICBpZiAoIXJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBldmVudCA9ICdyZW1vdmUnO1xuICAgICAgICByZW1vdGUuaXNLbm93bk9iamVjdChvYmplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgICBldmVudCA9ICd1cGRhdGUnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV2ZW50ID0gJ2FkZCc7XG4gICAgICAgICAgcmVtb3RlLm1hcmtBc0tub3duT2JqZWN0KG9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVtb3RlLnRyaWdnZXIoZXZlbnQsIG9iamVjdCk7XG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCArICc6JyArIG9iamVjdC50eXBlLCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoZXZlbnQgKyAnOicgKyBvYmplY3QudHlwZSArICc6JyArIG9iamVjdC5pZCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2UnLCBldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2U6JyArIG9iamVjdC50eXBlLCBldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2U6JyArIG9iamVjdC50eXBlICsgJzonICsgb2JqZWN0LmlkLCBldmVudCwgb2JqZWN0KTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGJvb3RzdHJhcCBrbm93biBvYmplY3RzXG4gIC8vXG4gIGlmIChvcHRpb25zLmtub3duT2JqZWN0cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy5rbm93bk9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlbW90ZS5tYXJrQXNLbm93bk9iamVjdCh7XG4gICAgICAgIHR5cGU6IG9wdGlvbnMua25vd25PYmplY3RzW2ldLnR5cGUsXG4gICAgICAgIGlkOiBvcHRpb25zLmtub3duT2JqZWN0c1tpXS5pZFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBleHBvc2UgcHVibGljIEFQSVxuICByZXR1cm4gcmVtb3RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVJlbW90ZVN0b3JlO1xuIiwiLy8gc2NvcGVkIFN0b3JlXG4vLyA9PT09PT09PT09PT1cblxuLy8gc2FtZSBhcyBzdG9yZSwgYnV0IHdpdGggdHlwZSBwcmVzZXQgdG8gYW4gaW5pdGlhbGx5XG4vLyBwYXNzZWQgdmFsdWUuXG4vL1xudmFyIGhvb2RpZUV2ZW50cyA9IHJlcXVpcmUoJy4uL2V2ZW50cycpO1xuXG4vL1xuZnVuY3Rpb24gaG9vZGllU2NvcGVkU3RvcmVBcGkoaG9vZGllLCBzdG9yZUFwaSwgb3B0aW9ucykge1xuXG4gIC8vIG5hbWVcbiAgdmFyIHN0b3JlTmFtZSA9IG9wdGlvbnMubmFtZSB8fCAnc3RvcmUnO1xuICB2YXIgdHlwZSA9IG9wdGlvbnMudHlwZTtcbiAgdmFyIGlkID0gb3B0aW9ucy5pZDtcblxuICB2YXIgYXBpID0ge307XG5cbiAgLy8gc2NvcGVkIGJ5IHR5cGUgb25seVxuICBpZiAoIWlkKSB7XG5cbiAgICAvLyBhZGQgZXZlbnRzXG4gICAgaG9vZGllRXZlbnRzKGhvb2RpZSwge1xuICAgICAgY29udGV4dDogYXBpLFxuICAgICAgbmFtZXNwYWNlOiBzdG9yZU5hbWUgKyAnOicgKyB0eXBlXG4gICAgfSk7XG5cbiAgICAvL1xuICAgIGFwaS5zYXZlID0gZnVuY3Rpb24gc2F2ZShpZCwgcHJvcGVydGllcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLnNhdmUodHlwZSwgaWQsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5hZGQgPSBmdW5jdGlvbiBhZGQocHJvcGVydGllcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmFkZCh0eXBlLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZCA9IGZ1bmN0aW9uIGZpbmQoaWQpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5maW5kKHR5cGUsIGlkKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZE9yQWRkID0gZnVuY3Rpb24gZmluZE9yQWRkKGlkLCBwcm9wZXJ0aWVzKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZE9yQWRkKHR5cGUsIGlkLCBwcm9wZXJ0aWVzKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZEFsbCA9IGZ1bmN0aW9uIGZpbmRBbGwob3B0aW9ucykge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmZpbmRBbGwodHlwZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShpZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkudXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS51cGRhdGVBbGwgPSBmdW5jdGlvbiB1cGRhdGVBbGwob2JqZWN0VXBkYXRlLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkudXBkYXRlQWxsKHR5cGUsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShpZCwgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLnJlbW92ZSh0eXBlLCBpZCwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHJlbW92ZUFsbChvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlQWxsKHR5cGUsIG9wdGlvbnMpO1xuICAgIH07XG4gIH1cblxuICAvLyBzY29wZWQgYnkgYm90aDogdHlwZSAmIGlkXG4gIGlmIChpZCkge1xuXG4gICAgLy8gYWRkIGV2ZW50c1xuICAgIGhvb2RpZUV2ZW50cyhob29kaWUsIHtcbiAgICAgIGNvbnRleHQ6IGFwaSxcbiAgICAgIG5hbWVzcGFjZTogc3RvcmVOYW1lICsgJzonICsgdHlwZSArICc6JyArIGlkXG4gICAgfSk7XG5cbiAgICAvL1xuICAgIGFwaS5zYXZlID0gZnVuY3Rpb24gc2F2ZShwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLmZpbmQgPSBmdW5jdGlvbiBmaW5kKCkge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmZpbmQodHlwZSwgaWQpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUob2JqZWN0VXBkYXRlLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkudXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUob3B0aW9ucykge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLnJlbW92ZSh0eXBlLCBpZCwgb3B0aW9ucyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vXG4gIGFwaS5kZWNvcmF0ZVByb21pc2VzID0gc3RvcmVBcGkuZGVjb3JhdGVQcm9taXNlcztcbiAgYXBpLnZhbGlkYXRlID0gc3RvcmVBcGkudmFsaWRhdGU7XG5cbiAgcmV0dXJuIGFwaTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVTY29wZWRTdG9yZUFwaTtcbiIsInZhciBjaGFycywgaSwgcmFkaXg7XG5cbi8vIHV1aWRzIGNvbnNpc3Qgb2YgbnVtYmVycyBhbmQgbG93ZXJjYXNlIGxldHRlcnMgb25seS5cbi8vIFdlIHN0aWNrIHRvIGxvd2VyY2FzZSBsZXR0ZXJzIHRvIHByZXZlbnQgY29uZnVzaW9uXG4vLyBhbmQgdG8gcHJldmVudCBpc3N1ZXMgd2l0aCBDb3VjaERCLCBlLmcuIGRhdGFiYXNlXG4vLyBuYW1lcyBkbyB3b25seSBhbGxvdyBmb3IgbG93ZXJjYXNlIGxldHRlcnMuXG5jaGFycyA9ICcwMTIzNDU2Nzg5YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKTtcbnJhZGl4ID0gY2hhcnMubGVuZ3RoO1xuXG4vLyBoZWxwZXIgdG8gZ2VuZXJhdGUgdW5pcXVlIGlkcy5cbmZ1bmN0aW9uIGdlbmVyYXRlSWQgKGxlbmd0aCkge1xuICB2YXIgaWQgPSAnJztcblxuICAvLyBkZWZhdWx0IHV1aWQgbGVuZ3RoIHRvIDdcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gNztcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciByYW5kID0gTWF0aC5yYW5kb20oKSAqIHJhZGl4O1xuICAgIHZhciBjaGFyID0gY2hhcnNbTWF0aC5mbG9vcihyYW5kKV07XG4gICAgaWQgKz0gU3RyaW5nKGNoYXIpLmNoYXJBdCgwKTtcbiAgfVxuXG4gIHJldHVybiBpZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZUlkO1xuIiwidmFyIGZpbmRMZXR0ZXJzVG9VcHBlckNhc2UgPSAvKF5cXHd8X1xcdykvZztcblxuZnVuY3Rpb24gaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lIChuYW1lKSB7XG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoZmluZExldHRlcnNUb1VwcGVyQ2FzZSwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgcmV0dXJuIChtYXRjaFsxXSB8fCBtYXRjaFswXSkudG9VcHBlckNhc2UoKTtcbiAgfSk7XG5cbiAgcmV0dXJuICdIb29kaWUnICsgbmFtZSArICdFcnJvcic7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lOyIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9O21vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmpRdWVyeS5EZWZlcnJlZDsiLCIvLyByZXR1cm5zIHRydWUgaWYgcGFzc2VkIG9iamVjdCBpcyBhIHByb21pc2UgKGJ1dCBub3QgYSBkZWZlcnJlZCksXG4vLyBvdGhlcndpc2UgZmFsc2UuXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqZWN0KSB7XG4gIHJldHVybiAhISAob2JqZWN0ICYmXG4gICAgICAgICAgICAgdHlwZW9mIG9iamVjdC5kb25lID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgdHlwZW9mIG9iamVjdC5yZXNvbHZlICE9PSAnZnVuY3Rpb24nKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc1Byb21pc2U7IiwidmFyIGdldERlZmVyID0gcmVxdWlyZSgnLi9kZWZlcicpO1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi4vLi4vbGliL2Vycm9yL2Vycm9yJyk7XG5cbi8vXG5mdW5jdGlvbiByZWplY3RXaXRoKGVycm9yUHJvcGVydGllcykge1xuICB2YXIgZXJyb3IgPSBuZXcgSG9vZGllRXJyb3IoZXJyb3JQcm9wZXJ0aWVzKTtcbiAgcmV0dXJuIGdldERlZmVyKCkucmVqZWN0KGVycm9yKS5wcm9taXNlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVqZWN0V2l0aDtcbiIsInZhciBnZXREZWZlciA9IHJlcXVpcmUoJy4vZGVmZXInKTtcblxuLy9cbmZ1bmN0aW9uIHJlc29sdmVXaXRoKCkge1xuICB2YXIgZGVmZXIgPSBnZXREZWZlcigpO1xuICByZXR1cm4gZGVmZXIucmVzb2x2ZS5hcHBseShkZWZlciwgYXJndW1lbnRzKS5wcm9taXNlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzb2x2ZVdpdGg7XG4iLCIvLyBIb29kaWUgQWRtaW5cbi8vIC0tLS0tLS0tLS0tLS1cbi8vXG4vLyB5b3VyIGZyaWVuZGx5IGxpYnJhcnkgZm9yIHBvY2tldCxcbi8vIHRoZSBIb29kaWUgQWRtaW4gVUlcbi8vXG52YXIgaG9vZGllUmVxdWVzdCA9IHJlcXVpcmUoJ2hvb2RpZS9zcmMvaG9vZGllL3JlcXVlc3QnKTtcbnZhciBob29kaWVPcGVuID0gcmVxdWlyZSgnaG9vZGllL3NyYy9ob29kaWUvb3BlbicpO1xuXG52YXIgaG9vZGllQWRtaW5BY2NvdW50ID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vYWNjb3VudCcpO1xudmFyIGhvb2RpZUFkbWluUGx1Z2luID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vcGx1Z2luJyk7XG52YXIgaG9vZGllQWRtaW5Vc2VyID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vdXNlcicpO1xuXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnaG9vZGllL3NyYy9saWIvZXZlbnRzJyk7XG5cbi8vIENvbnN0cnVjdG9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIFdoZW4gaW5pdGlhbGl6aW5nIGEgaG9vZGllIGluc3RhbmNlLCBhbiBvcHRpb25hbCBVUkxcbi8vIGNhbiBiZSBwYXNzZWQuIFRoYXQncyB0aGUgVVJMIG9mIHRoZSBob29kaWUgYmFja2VuZC5cbi8vIElmIG5vIFVSTCBwYXNzZWQgaXQgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgZG9tYWluLlxuLy9cbi8vICAgICAvLyBpbml0IGEgbmV3IGhvb2RpZSBpbnN0YW5jZVxuLy8gICAgIGhvb2RpZSA9IG5ldyBIb29kaWVcbi8vXG5mdW5jdGlvbiBIb29kaWVBZG1pbihiYXNlVXJsKSB7XG4gIHZhciBob29kaWVBZG1pbiA9IHRoaXM7XG5cbiAgLy8gZW5mb3JjZSBpbml0aWFsaXphdGlvbiB3aXRoIGBuZXdgXG4gIGlmICghKGhvb2RpZUFkbWluIGluc3RhbmNlb2YgSG9vZGllQWRtaW4pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2FnZTogbmV3IEhvb2RpZUFkbWluKHVybCk7Jyk7XG4gIH1cblxuICAvLyByZW1vdmUgdHJhaWxpbmcgc2xhc2hlc1xuICBob29kaWVBZG1pbi5iYXNlVXJsID0gYmFzZVVybCA/IGJhc2VVcmwucmVwbGFjZSgvXFwvKyQvLCAnJykgOiAnJztcblxuXG4gIC8vIGhvb2RpZUFkbWluLmV4dGVuZFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgaG9vZGllQWRtaW4gaW5zdGFuY2U6XG4gIC8vXG4gIC8vICAgICBob29kaWVBZG1pbi5leHRlbmQoZnVuY3Rpb24oaG9vZGllQWRtaW4pIHt9IClcbiAgLy9cbiAgaG9vZGllQWRtaW4uZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKGV4dGVuc2lvbikge1xuICAgIGV4dGVuc2lvbihob29kaWVBZG1pbik7XG4gIH07XG5cbiAgLy9cbiAgLy8gRXh0ZW5kaW5nIGhvb2RpZSBhZG1pbiBjb3JlXG4gIC8vXG5cbiAgLy8gKiBob29kaWVBZG1pbi5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub25cbiAgLy8gKiBob29kaWVBZG1pbi5vbmVcbiAgLy8gKiBob29kaWVBZG1pbi50cmlnZ2VyXG4gIC8vICogaG9vZGllQWRtaW4udW5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub2ZmXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVFdmVudHMpO1xuXG4gIC8vICogaG9vZGllQWRtaW4ucmVxdWVzdFxuICBob29kaWVBZG1pbi5leHRlbmQoaG9vZGllUmVxdWVzdCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5vcGVuXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVPcGVuKTtcblxuICAvLyAqIGhvb2RpZUFkbWluLmFjY291bnRcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluQWNjb3VudCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5wbHVnaW5cbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluUGx1Z2luKTtcblxuICAvLyAqIGhvb2RpZUFkbWluLnVzZXJcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluVXNlcik7XG5cbiAgLy9cbiAgLy8gbG9hZGluZyB1c2VyIGV4dGVuc2lvbnNcbiAgLy9cbiAgYXBwbHlFeHRlbnNpb25zKEhvb2RpZUFkbWluKTtcbn1cblxuLy8gRXh0ZW5kaW5nIEhvb2RpZUFkbWluXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFlvdSBjYW4gZXh0ZW5kIHRoZSBIb29kaWUgY2xhc3MgbGlrZSBzbzpcbi8vXG4vLyBIb29kaWUuZXh0ZW5kKGZ1bmNpb24oSG9vZGllQWRtaW4pIHsgSG9vZGllQWRtaW4ubXlNYWdpYyA9IGZ1bmN0aW9uKCkge30gfSlcbi8vXG5cbnZhciBleHRlbnNpb25zID0gW107XG5cbkhvb2RpZUFkbWluLmV4dGVuZCA9IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICBleHRlbnNpb25zLnB1c2goZXh0ZW5zaW9uKTtcbn07XG5cbi8vXG4vLyBkZXRlY3QgYXZhaWxhYmxlIGV4dGVuc2lvbnMgYW5kIGF0dGFjaCB0byBIb29kaWUgT2JqZWN0LlxuLy9cbmZ1bmN0aW9uIGFwcGx5RXh0ZW5zaW9ucyhob29kaWUpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHRlbnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgZXh0ZW5zaW9uc1tpXShob29kaWUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllQWRtaW47XG4iLCIvLyBIb29kaWVBZG1pbiBBY2NvdW50XG4vLyA9PT09PT09PT09PT09PT09PT09XG5cbnZhciBob29kaWVFdmVudHMgPSByZXF1aXJlKCdob29kaWUvc3JjL2xpYi9ldmVudHMnKTtcblxudmFyIEFETUlOX1VTRVJOQU1FID0gJ2FkbWluJztcblxuZnVuY3Rpb24gaG9vZGllQWNjb3VudCAoaG9vZGllQWRtaW4pIHtcblxuICAvLyBwdWJsaWMgQVBJXG4gIHZhciBhY2NvdW50ID0ge307XG4gIHZhciBzaWduZWRJbiA9IG51bGw7XG5cbiAgLy8gYWRkIGV2ZW50cyBBUElcbiAgaG9vZGllRXZlbnRzKGhvb2RpZUFkbWluLCB7XG4gICAgY29udGV4dDogYWNjb3VudCxcbiAgICBuYW1lc3BhY2U6ICdhY2NvdW50J1xuICB9KTtcblxuXG4gIC8vIHNpZ24gaW4gd2l0aCBwYXNzd29yZFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gdXNlcm5hbWUgaXMgaGFyZGNvZGVkIHRvIFwiYWRtaW5cIlxuICBhY2NvdW50LnNpZ25JbiA9IGZ1bmN0aW9uIHNpZ25JbihwYXNzd29yZCkge1xuICAgIHZhciByZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgbmFtZTogQURNSU5fVVNFUk5BTUUsXG4gICAgICAgIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gaG9vZGllQWRtaW4ucmVxdWVzdCgnUE9TVCcsICcvX3Nlc3Npb24nLCByZXF1ZXN0T3B0aW9ucylcbiAgICAuZG9uZSggZnVuY3Rpb24oKSB7XG4gICAgICBzaWduZWRJbiA9IHRydWU7XG4gICAgICBhY2NvdW50LnRyaWdnZXIoJ3NpZ25pbicsIEFETUlOX1VTRVJOQU1FKTtcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHNpZ24gb3V0XG4gIC8vIC0tLS0tLS0tLVxuICBhY2NvdW50LnNpZ25PdXQgPSBmdW5jdGlvbiBzaWduT3V0KCkge1xuICAgIHJldHVybiBob29kaWVBZG1pbi5yZXF1ZXN0KCdERUxFVEUnLCAnL19zZXNzaW9uJylcbiAgICAuZG9uZSggZnVuY3Rpb24oKSB7XG4gICAgICBzaWduZWRJbiA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGhvb2RpZUFkbWluLnRyaWdnZXIoJ3NpZ25vdXQnKTtcbiAgICB9KTtcbiAgfTtcblxuICBhY2NvdW50Lmhhc1ZhbGlkU2Vzc2lvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhIXNpZ25lZEluO1xuICB9O1xuXG4gIGFjY291bnQuaGFzSW5WYWxpZFNlc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gISFzaWduZWRJbjtcbiAgfTtcblxuICBob29kaWVBZG1pbi5hY2NvdW50ID0gYWNjb3VudDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVBY2NvdW50O1xuXG4iLCJmdW5jdGlvbiBob29kaWVBZG1pblBsdWdpbihob29kaWVBZG1pbikge1xuICBob29kaWVBZG1pbi5wbHVnaW5zID0gaG9vZGllQWRtaW4ub3BlbigncGx1Z2lucycpO1xuICBob29kaWVBZG1pbi5wbHVnaW5zLmNvbm5lY3QoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVBZG1pblBsdWdpbjtcblxuIiwiZnVuY3Rpb24gaG9vZGllQWRtaW5Vc2VyKGhvb2RpZUFkbWluKSB7XG4gIGhvb2RpZUFkbWluLnVzZXIgPSBob29kaWVBZG1pbi5vcGVuKCdfdXNlcnMnLCB7XG4gICAgcHJlZml4OiAnb3JnLmNvdWNoZGIudXNlcjonXG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZUFkbWluVXNlcjtcblxuIl19
(17)
});
;