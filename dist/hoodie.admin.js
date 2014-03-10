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

},{"../lib/store/remote":8,"extend":1}],3:[function(require,module,exports){
// Hoodie Error
// -------------

// With the custom hoodie error function
// we normalize all errors the get returned
// when using hoodie.rejectWith
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


},{"extend":1}],4:[function(require,module,exports){
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

},{"./error":3}],5:[function(require,module,exports){
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

},{"./error":3}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
      return hoodie.rejectWith(error);
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
        return hoodie.resolveWith(currentObject);
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
        return hoodie.resolveWith(newObj);
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
    case hoodie.isPromise(filterOrObjects):
      promise = filterOrObjects;
      break;
    case $.isArray(filterOrObjects):
      promise = hoodie.defer().resolve(filterOrObjects).promise();
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

},{"../error/error":3,"../error/object_id":4,"../error/object_type":5,"../events":6,"./scoped":9,"extend":1}],8:[function(require,module,exports){
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

  // wrapper for hoodie.request, with some store specific defaults
  // and a prefixed path
  //
  remote.request = function request(type, path, options) {
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
      return hoodie.resolveWith([]);
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


  // ### _parseFromRemote

  // normalize objects coming from remote
  //
  // renames `_id` attribute to `id` and removes the type from the id,
  // e.g. `type/123` -> `123`
  //
  function parseFromRemote(object) {
    var id, ignore, _ref;

    // handle id and type
    id = object._id || object.id;
    delete object._id;

    if (remote.prefix) {
      id = id.replace(remotePrefixPattern, '');
      // id = id.replace(new RegExp('^' + remote.prefix), '');
    }

    // turn doc/123 into type = doc & id = 123
    // NOTE: we don't use a simple id.split(/\//) here,
    // as in some cases IDs might contain '/', too
    //
    _ref = id.match(/([^\/]+)\/(.*)/), ignore = _ref[0], object.type = _ref[1], object.id = _ref[2];

    return object;
  }

  function parseAllFromRemote(objects) {
    var object, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      _results.push(parseFromRemote(object));
    }
    return _results;
  }


  // ### _addRevisionTo

  // extends passed object with a _rev property
  //
  function addRevisionTo(attributes) {
    var currentRevId, currentRevNr, newRevisionId, _ref;
    try {
      _ref = attributes._rev.split(/-/), currentRevNr = _ref[0], currentRevId = _ref[1];
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

},{"../../utils/generate_id":10,"./api":7,"extend":1}],9:[function(require,module,exports){
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

},{"../events":6}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
var findLettersToUpperCase = /(^\w|_\w)/g;

function hoodiefyRequestErrorName (name) {
  name = name.replace(findLettersToUpperCase, function (match) {
    return (match[1] || match[0]).toUpperCase();
  });

  return 'Hoodie' + name + 'Error';
}

module.exports = hoodiefyRequestErrorName;
},{}],12:[function(require,module,exports){
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

var hoodiefyRequestErrorName = require('./hoodiefy_request_error_name');
var extend = require('extend');

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

    return hoodie.rejectWith(error).promise();
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

},{"./hoodiefy_request_error_name":11,"extend":1}],13:[function(require,module,exports){
// Hoodie Admin
// -------------
//
// your friendly library for pocket,
// the Hoodie Admin UI
//
var hoodieRequest = require('hoodie/src/utils/request');
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

},{"./hoodie.admin/account":14,"./hoodie.admin/plugin":15,"./hoodie.admin/user":16,"hoodie/src/hoodie/open":2,"hoodie/src/lib/events":6,"hoodie/src/utils/request":12}],14:[function(require,module,exports){
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


},{"hoodie/src/lib/events":6}],15:[function(require,module,exports){
function hoodieAdminPlugin(hoodieAdmin) {
  hoodieAdmin.plugins = hoodieAdmin.open('plugins');
  hoodieAdmin.plugins.connect();
}

module.exports = hoodieAdminPlugin;


},{}],16:[function(require,module,exports){
function hoodieAdminUser(hoodieAdmin) {
  hoodieAdmin.user = hoodieAdmin.open('_users', {
    prefix: 'org.couchdb.user:'
  });
}

module.exports = hoodieAdminUser;


},{}]},{},[13])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvZXh0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL29wZW4uanMiLCIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9saWIvZXJyb3IvZXJyb3IuanMiLCIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9saWIvZXJyb3Ivb2JqZWN0X2lkLmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvbGliL2Vycm9yL29iamVjdF90eXBlLmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvbGliL2V2ZW50cy5qcyIsIi9Vc2Vycy9zdmVubGl0by9Qcm9qZWN0cy9ob29kaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2xpYi9zdG9yZS9hcGkuanMiLCIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9saWIvc3RvcmUvcmVtb3RlLmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvbGliL3N0b3JlL3Njb3BlZC5qcyIsIi9Vc2Vycy9zdmVubGl0by9Qcm9qZWN0cy9ob29kaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL3V0aWxzL2dlbmVyYXRlX2lkLmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvdXRpbHMvaG9vZGllZnlfcmVxdWVzdF9lcnJvcl9uYW1lLmpzIiwiL1VzZXJzL3N2ZW5saXRvL1Byb2plY3RzL2hvb2RpZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvdXRpbHMvcmVxdWVzdC5qcyIsIi9Vc2Vycy9zdmVubGl0by9Qcm9qZWN0cy9ob29kaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4uanMiLCIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9zcmMvaG9vZGllLmFkbWluL2FjY291bnQuanMiLCIvVXNlcnMvc3ZlbmxpdG8vUHJvamVjdHMvaG9vZGllL2hvb2RpZS5hZG1pbi5qcy9zcmMvaG9vZGllLmFkbWluL3BsdWdpbi5qcyIsIi9Vc2Vycy9zdmVubGl0by9Qcm9qZWN0cy9ob29kaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4vdXNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsd0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IG9iai5ub2RlVHlwZSB8fCBvYmouc2V0SW50ZXJ2YWwpXG5cdFx0cmV0dXJuIGZhbHNlO1xuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpXG5cdFx0cmV0dXJuIGZhbHNlO1xuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yICgga2V5IGluIG9iaiApIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKCBvYmosIGtleSApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0ICAgIHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fSxcblx0ICAgIGkgPSAxLFxuXHQgICAgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgIGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICggdHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIgKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9XG5cblx0Ly8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG5cdGlmICggdHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1sgbmFtZSBdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKCB0YXJnZXQgPT09IGNvcHkgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKCBkZWVwICYmIGNvcHkgJiYgKCBpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3B5SXNBcnJheSApIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHkgKTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcbiIsIi8vIE9wZW4gc3RvcmVzXG4vLyAtLS0tLS0tLS0tLS0tXG5cbnZhciBob29kaWVSZW1vdGVTdG9yZSA9IHJlcXVpcmUoJy4uL2xpYi9zdG9yZS9yZW1vdGUnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKTtcblxuZnVuY3Rpb24gaG9vZGllT3Blbihob29kaWUpIHtcblxuICAvLyBnZW5lcmljIG1ldGhvZCB0byBvcGVuIGEgc3RvcmUuXG4gIC8vXG4gIC8vICAgICBob29kaWUub3BlbihcInNvbWVfc3RvcmVfbmFtZVwiKS5maW5kQWxsKClcbiAgLy9cbiAgZnVuY3Rpb24gb3BlbihzdG9yZU5hbWUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGV4dGVuZChvcHRpb25zLCB7XG4gICAgICBuYW1lOiBzdG9yZU5hbWVcbiAgICB9KTtcblxuICAgIHJldHVybiBob29kaWVSZW1vdGVTdG9yZShob29kaWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgLy9cbiAgLy8gUHVibGljIEFQSVxuICAvL1xuICBob29kaWUub3BlbiA9IG9wZW47XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllT3BlbjtcbiIsIi8vIEhvb2RpZSBFcnJvclxuLy8gLS0tLS0tLS0tLS0tLVxuXG4vLyBXaXRoIHRoZSBjdXN0b20gaG9vZGllIGVycm9yIGZ1bmN0aW9uXG4vLyB3ZSBub3JtYWxpemUgYWxsIGVycm9ycyB0aGUgZ2V0IHJldHVybmVkXG4vLyB3aGVuIHVzaW5nIGhvb2RpZS5yZWplY3RXaXRoXG4vL1xuLy8gVGhlIG5hdGl2ZSBKYXZhU2NyaXB0IGVycm9yIG1ldGhvZCBoYXNcbi8vIGEgbmFtZSAmIGEgbWVzc2FnZSBwcm9wZXJ0eS4gSG9vZGllRXJyb3Jcbi8vIHJlcXVpcmVzIHRoZXNlLCBidXQgb24gdG9wIGFsbG93cyBmb3Jcbi8vIHVubGltaXRlZCBjdXN0b20gcHJvcGVydGllcy5cbi8vXG4vLyBJbnN0ZWFkIG9mIGJlaW5nIGluaXRpYWxpemVkIHdpdGgganVzdFxuLy8gdGhlIG1lc3NhZ2UsIEhvb2RpZUVycm9yIGV4cGVjdHMgYW5cbi8vIG9iamVjdCB3aXRoIHByb3Blcml0ZXMuIFRoZSBgbWVzc2FnZWBcbi8vIHByb3BlcnR5IGlzIHJlcXVpcmVkLiBUaGUgbmFtZSB3aWxsXG4vLyBmYWxsYmFjayB0byBgZXJyb3JgLlxuLy9cbi8vIGBtZXNzYWdlYCBjYW4gYWxzbyBjb250YWluIHBsYWNlaG9sZGVyc1xuLy8gaW4gdGhlIGZvcm0gb2YgYHt7cHJvcGVydHlOYW1lfX1gYCB3aGljaFxuLy8gd2lsbCBnZXQgcmVwbGFjZWQgYXV0b21hdGljYWxseSB3aXRoIHBhc3NlZFxuLy8gZXh0cmEgcHJvcGVydGllcy5cbi8vXG4vLyAjIyMgRXJyb3IgQ29udmVudGlvbnNcbi8vXG4vLyBXZSBmb2xsb3cgSmF2YVNjcmlwdCdzIG5hdGl2ZSBlcnJvciBjb252ZW50aW9ucyxcbi8vIG1lYW5pbmcgdGhhdCBlcnJvciBuYW1lcyBhcmUgY2FtZWxDYXNlIHdpdGggdGhlXG4vLyBmaXJzdCBsZXR0ZXIgdXBwZXJjYXNlIGFzIHdlbGwsIGFuZCB0aGUgbWVzc2FnZVxuLy8gc3RhcnRpbmcgd2l0aCBhbiB1cHBlcmNhc2UgbGV0dGVyLlxuLy9cbnZhciBlcnJvck1lc3NhZ2VSZXBsYWNlUGF0dGVybiA9IC9cXHtcXHtcXHMqXFx3K1xccypcXH1cXH0vZztcbnZhciBlcnJvck1lc3NhZ2VGaW5kUHJvcGVydHlQYXR0ZXJuID0gL1xcdysvO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJyk7XG5cbmZ1bmN0aW9uIEhvb2RpZUVycm9yKHByb3BlcnRpZXMpIHtcblxuICAvLyBub3JtYWxpemUgYXJndW1lbnRzXG4gIGlmICh0eXBlb2YgcHJvcGVydGllcyA9PT0gJ3N0cmluZycpIHtcbiAgICBwcm9wZXJ0aWVzID0ge1xuICAgICAgbWVzc2FnZTogcHJvcGVydGllc1xuICAgIH07XG4gIH1cblxuICBpZiAoISBwcm9wZXJ0aWVzLm1lc3NhZ2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZBVEFMOiBlcnJvci5tZXNzYWdlIG11c3QgYmUgc2V0Jyk7XG4gIH1cblxuICAvLyBtdXN0IGNoZWNrIGZvciBwcm9wZXJ0aWVzLCBhcyB0aGlzLm5hbWUgaXMgYWx3YXlzIHNldC5cbiAgaWYgKCEgcHJvcGVydGllcy5uYW1lKSB7XG4gICAgcHJvcGVydGllcy5uYW1lID0gJ0hvb2RpZUVycm9yJztcbiAgfVxuXG4gIHByb3BlcnRpZXMubWVzc2FnZSA9IHByb3BlcnRpZXMubWVzc2FnZS5yZXBsYWNlKGVycm9yTWVzc2FnZVJlcGxhY2VQYXR0ZXJuLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHZhciBwcm9wZXJ0eSA9IG1hdGNoLm1hdGNoKGVycm9yTWVzc2FnZUZpbmRQcm9wZXJ0eVBhdHRlcm4pWzBdO1xuICAgIHJldHVybiBwcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgfSk7XG4gIGV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cbkhvb2RpZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuSG9vZGllRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSG9vZGllRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllRXJyb3I7XG5cbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IElEcy5cbi8vXG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cbi8vXG5mdW5jdGlvbiBIb29kaWVPYmplY3RJZEVycm9yKHByb3BlcnRpZXMpIHtcbiAgcHJvcGVydGllcy5uYW1lID0gJ0hvb2RpZU9iamVjdElkRXJyb3InO1xuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSAnXCJ7e2lkfX1cIiBpcyBpbnZhbGlkIG9iamVjdCBpZC4ge3tydWxlc319Lic7XG5cbiAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcihwcm9wZXJ0aWVzKTtcbn1cbnZhciB2YWxpZElkUGF0dGVybiA9IC9eW2EtejAtOVxcLV0rJC87XG5Ib29kaWVPYmplY3RJZEVycm9yLmlzSW52YWxpZCA9IGZ1bmN0aW9uKGlkLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAhKGN1c3RvbVBhdHRlcm4gfHwgdmFsaWRJZFBhdHRlcm4pLnRlc3QoaWQgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdElkRXJyb3IuaXNWYWxpZCA9IGZ1bmN0aW9uKGlkLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZElkUGF0dGVybikudGVzdChpZCB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0SWRFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnTG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0SWRFcnJvcjtcbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IHR5cGVzLCBwbHVzIG11c3Qgc3RhcnRcbi8vIHdpdGggYSBsZXR0ZXIuXG4vL1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG4vLyBIb29kaWUgSW52YWxpZCBUeXBlIE9yIElkIEVycm9yXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIG9ubHkgbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlc1xuLy8gYXJlIGFsbG93ZWQgZm9yIG9iamVjdCB0eXBlcywgcGx1cyBtdXN0IHN0YXJ0XG4vLyB3aXRoIGEgbGV0dGVyLlxuLy9cbmZ1bmN0aW9uIEhvb2RpZU9iamVjdFR5cGVFcnJvcihwcm9wZXJ0aWVzKSB7XG4gIHByb3BlcnRpZXMubmFtZSA9ICdIb29kaWVPYmplY3RUeXBlRXJyb3InO1xuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSAnXCJ7e3R5cGV9fVwiIGlzIGludmFsaWQgb2JqZWN0IHR5cGUuIHt7cnVsZXN9fS4nO1xuXG4gIHJldHVybiBuZXcgSG9vZGllRXJyb3IocHJvcGVydGllcyk7XG59XG52YXIgdmFsaWRUeXBlUGF0dGVybiA9IC9eW2EteiRdW2EtejAtOV0rJC87XG5Ib29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkID0gZnVuY3Rpb24odHlwZSwgY3VzdG9tUGF0dGVybikge1xuICByZXR1cm4gIShjdXN0b21QYXR0ZXJuIHx8IHZhbGlkVHlwZVBhdHRlcm4pLnRlc3QodHlwZSB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0VHlwZUVycm9yLmlzVmFsaWQgPSBmdW5jdGlvbih0eXBlLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZFR5cGVQYXR0ZXJuKS50ZXN0KHR5cGUgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdFR5cGVFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0VHlwZUVycm9yO1xuIiwiLy8gRXZlbnRzXG4vLyA9PT09PT09PVxuLy9cbi8vIGV4dGVuZCBhbnkgQ2xhc3Mgd2l0aCBzdXBwb3J0IGZvclxuLy9cbi8vICogYG9iamVjdC5iaW5kKCdldmVudCcsIGNiKWBcbi8vICogYG9iamVjdC51bmJpbmQoJ2V2ZW50JywgY2IpYFxuLy8gKiBgb2JqZWN0LnRyaWdnZXIoJ2V2ZW50JywgYXJncy4uLilgXG4vLyAqIGBvYmplY3Qub25lKCdldicsIGNiKWBcbi8vXG4vLyBiYXNlZCBvbiBbRXZlbnRzIGltcGxlbWVudGF0aW9ucyBmcm9tIFNwaW5lXShodHRwczovL2dpdGh1Yi5jb20vbWFjY21hbi9zcGluZS9ibG9iL21hc3Rlci9zcmMvc3BpbmUuY29mZmVlI0wxKVxuLy9cblxuLy8gY2FsbGJhY2tzIGFyZSBnbG9iYWwsIHdoaWxlIHRoZSBldmVudHMgQVBJIGlzIHVzZWQgYXQgc2V2ZXJhbCBwbGFjZXMsXG4vLyBsaWtlIGhvb2RpZS5vbiAvIGhvb2RpZS5zdG9yZS5vbiAvIGhvb2RpZS50YXNrLm9uIGV0Yy5cbi8vXG5mdW5jdGlvbiBob29kaWVFdmVudHMoaG9vZGllLCBvcHRpb25zKSB7XG4gIHZhciBjb250ZXh0ID0gaG9vZGllO1xuICB2YXIgbmFtZXNwYWNlID0gJyc7XG5cbiAgLy8gbm9ybWFsaXplIG9wdGlvbnMgaGFzaFxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBtYWtlIHN1cmUgY2FsbGJhY2tzIGhhc2ggZXhpc3RzXG4gIGlmICghaG9vZGllLmV2ZW50c0NhbGxiYWNrcykge1xuICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gb3B0aW9ucy5jb250ZXh0O1xuICAgIG5hbWVzcGFjZSA9IG9wdGlvbnMubmFtZXNwYWNlICsgJzonO1xuICB9XG5cbiAgLy8gQmluZFxuICAvLyAtLS0tLS1cbiAgLy9cbiAgLy8gYmluZCBhIGNhbGxiYWNrIHRvIGFuIGV2ZW50IHRyaWdnZXJkIGJ5IHRoZSBvYmplY3RcbiAgLy9cbiAgLy8gICAgIG9iamVjdC5iaW5kICdjaGVhdCcsIGJsYW1lXG4gIC8vXG4gIGZ1bmN0aW9uIGJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGV2cywgbmFtZSwgX2ksIF9sZW47XG5cbiAgICBldnMgPSBldi5zcGxpdCgnICcpO1xuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBldnMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIG5hbWUgPSBuYW1lc3BhY2UgKyBldnNbX2ldO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tuYW1lXSA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbbmFtZV0gfHwgW107XG4gICAgICBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8vIG9uZVxuICAvLyAtLS0tLVxuICAvL1xuICAvLyBzYW1lIGFzIGBiaW5kYCwgYnV0IGRvZXMgZ2V0IGV4ZWN1dGVkIG9ubHkgb25jZVxuICAvL1xuICAvLyAgICAgb2JqZWN0Lm9uZSAnZ3JvdW5kVG91Y2gnLCBnYW1lT3ZlclxuICAvL1xuICBmdW5jdGlvbiBvbmUoZXYsIGNhbGxiYWNrKSB7XG4gICAgZXYgPSBuYW1lc3BhY2UgKyBldjtcbiAgICB2YXIgd3JhcHBlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBob29kaWUudW5iaW5kKGV2LCB3cmFwcGVyKTtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgaG9vZGllLmJpbmQoZXYsIHdyYXBwZXIpO1xuICB9XG5cbiAgLy8gdHJpZ2dlclxuICAvLyAtLS0tLS0tLS1cbiAgLy9cbiAgLy8gdHJpZ2dlciBhbiBldmVudCBhbmQgcGFzcyBvcHRpb25hbCBwYXJhbWV0ZXJzIGZvciBiaW5kaW5nLlxuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIgJ3dpbicsIHNjb3JlOiAxMjMwXG4gIC8vXG4gIGZ1bmN0aW9uIHRyaWdnZXIoKSB7XG4gICAgdmFyIGFyZ3MsIGNhbGxiYWNrLCBldiwgbGlzdCwgX2ksIF9sZW47XG5cbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIGV2ID0gYXJncy5zaGlmdCgpO1xuICAgIGV2ID0gbmFtZXNwYWNlICsgZXY7XG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBsaXN0Lmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBjYWxsYmFjayA9IGxpc3RbX2ldO1xuICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyB1bmJpbmRcbiAgLy8gLS0tLS0tLS1cbiAgLy9cbiAgLy8gdW5iaW5kIHRvIGZyb20gYWxsIGJpbmRpbmdzLCBmcm9tIGFsbCBiaW5kaW5ncyBvZiBhIHNwZWNpZmljIGV2ZW50XG4gIC8vIG9yIGZyb20gYSBzcGVjaWZpYyBiaW5kaW5nLlxuICAvL1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCgpXG4gIC8vICAgICBvYmplY3QudW5iaW5kICdtb3ZlJ1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCAnbW92ZScsIGZvbGxvd1xuICAvL1xuICBmdW5jdGlvbiB1bmJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNiLCBpLCBsaXN0LCBfaSwgX2xlbiwgZXZOYW1lcztcblxuICAgIGlmICghZXYpIHtcbiAgICAgIGlmICghbmFtZXNwYWNlKSB7XG4gICAgICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgICAgIH1cblxuICAgICAgZXZOYW1lcyA9IE9iamVjdC5rZXlzKGhvb2RpZS5ldmVudHNDYWxsYmFja3MpO1xuICAgICAgZXZOYW1lcyA9IGV2TmFtZXMuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5LmluZGV4T2YobmFtZXNwYWNlKSA9PT0gMDtcbiAgICAgIH0pO1xuICAgICAgZXZOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBkZWxldGUgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1trZXldO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldiA9IG5hbWVzcGFjZSArIGV2O1xuXG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgZGVsZXRlIGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoaSA9IF9pID0gMCwgX2xlbiA9IGxpc3QubGVuZ3RoOyBfaSA8IF9sZW47IGkgPSArK19pKSB7XG4gICAgICBjYiA9IGxpc3RbaV07XG5cblxuICAgICAgaWYgKGNiICE9PSBjYWxsYmFjaykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGlzdCA9IGxpc3Quc2xpY2UoKTtcbiAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl0gPSBsaXN0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGV4dC5iaW5kID0gYmluZDtcbiAgY29udGV4dC5vbiA9IGJpbmQ7XG4gIGNvbnRleHQub25lID0gb25lO1xuICBjb250ZXh0LnRyaWdnZXIgPSB0cmlnZ2VyO1xuICBjb250ZXh0LnVuYmluZCA9IHVuYmluZDtcbiAgY29udGV4dC5vZmYgPSB1bmJpbmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllRXZlbnRzO1xuIiwiLy8gU3RvcmVcbi8vID09PT09PT09PT09PVxuXG4vLyBUaGlzIGNsYXNzIGRlZmluZXMgdGhlIEFQSSB0aGF0IGhvb2RpZS5zdG9yZSAobG9jYWwgc3RvcmUpIGFuZCBob29kaWUub3BlblxuLy8gKHJlbW90ZSBzdG9yZSkgaW1wbGVtZW50IHRvIGFzc3VyZSBhIGNvaGVyZW50IEFQSS4gSXQgYWxzbyBpbXBsZW1lbnRzIHNvbWVcbi8vIGJhc2ljIHZhbGlkYXRpb25zLlxuLy9cbi8vIFRoZSByZXR1cm5lZCBBUEkgcHJvdmlkZXMgdGhlIGZvbGxvd2luZyBtZXRob2RzOlxuLy9cbi8vICogdmFsaWRhdGVcbi8vICogc2F2ZVxuLy8gKiBhZGRcbi8vICogZmluZFxuLy8gKiBmaW5kT3JBZGRcbi8vICogZmluZEFsbFxuLy8gKiB1cGRhdGVcbi8vICogdXBkYXRlQWxsXG4vLyAqIHJlbW92ZVxuLy8gKiByZW1vdmVBbGxcbi8vICogZGVjb3JhdGVQcm9taXNlc1xuLy8gKiB0cmlnZ2VyXG4vLyAqIG9uXG4vLyAqIHVuYmluZFxuLy9cbi8vIEF0IHRoZSBzYW1lIHRpbWUsIHRoZSByZXR1cm5lZCBBUEkgY2FuIGJlIGNhbGxlZCBhcyBmdW5jdGlvbiByZXR1cm5pbmcgYVxuLy8gc3RvcmUgc2NvcGVkIGJ5IHRoZSBwYXNzZWQgdHlwZSwgZm9yIGV4YW1wbGVcbi8vXG4vLyAgICAgdmFyIHRhc2tTdG9yZSA9IGhvb2RpZS5zdG9yZSgndGFzaycpO1xuLy8gICAgIHRhc2tTdG9yZS5maW5kQWxsKCkudGhlbiggc2hvd0FsbFRhc2tzICk7XG4vLyAgICAgdGFza1N0b3JlLnVwZGF0ZSgnaWQxMjMnLCB7ZG9uZTogdHJ1ZX0pO1xuLy9cblxuLy9cbnZhciBob29kaWVTY29wZWRTdG9yZUFwaSA9IHJlcXVpcmUoJy4vc2NvcGVkJyk7XG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vZXZlbnRzJyk7XG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci9lcnJvcicpO1xudmFyIEhvb2RpZU9iamVjdFR5cGVFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yL29iamVjdF90eXBlJyk7XG52YXIgSG9vZGllT2JqZWN0SWRFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yL29iamVjdF9pZCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpO1xuXG4vL1xuZnVuY3Rpb24gaG9vZGllU3RvcmVBcGkoaG9vZGllLCBvcHRpb25zKSB7XG5cbiAgLy8gcGVyc2lzdGFuY2UgbG9naWNcbiAgdmFyIGJhY2tlbmQgPSB7fTtcblxuICAvLyBleHRlbmQgdGhpcyBwcm9wZXJ0eSB3aXRoIGV4dHJhIGZ1bmN0aW9ucyB0aGF0IHdpbGwgYmUgYXZhaWxhYmxlXG4gIC8vIG9uIGFsbCBwcm9taXNlcyByZXR1cm5lZCBieSBob29kaWUuc3RvcmUgQVBJLiBJdCBoYXMgYSByZWZlcmVuY2VcbiAgLy8gdG8gY3VycmVudCBob29kaWUgaW5zdGFuY2UgYnkgZGVmYXVsdFxuICB2YXIgcHJvbWlzZUFwaSA9IHtcbiAgICBob29kaWU6IGhvb2RpZVxuICB9O1xuXG4gIC8vIG5hbWVcbiAgdmFyIHN0b3JlTmFtZSA9IG9wdGlvbnMubmFtZSB8fCAnc3RvcmUnO1xuXG4gIC8vIHB1YmxpYyBBUElcbiAgdmFyIGFwaSA9IGZ1bmN0aW9uIGFwaSh0eXBlLCBpZCkge1xuICAgIHZhciBzY29wZWRPcHRpb25zID0gZXh0ZW5kKHRydWUsIHtcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBpZDogaWRcbiAgICB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gaG9vZGllU2NvcGVkU3RvcmVBcGkoaG9vZGllLCBhcGksIHNjb3BlZE9wdGlvbnMpO1xuICB9O1xuXG4gIC8vIGFkZCBldmVudCBBUElcbiAgaG9vZGllRXZlbnRzKGhvb2RpZSwge1xuICAgIGNvbnRleHQ6IGFwaSxcbiAgICBuYW1lc3BhY2U6IHN0b3JlTmFtZVxuICB9KTtcblxuXG4gIC8vIFZhbGlkYXRlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gYnkgZGVmYXVsdCwgd2Ugb25seSBjaGVjayBmb3IgYSB2YWxpZCB0eXBlICYgaWQuXG4gIC8vIHRoZSB2YWxpZGF0ZSBtZXRob2QgY2FuIGJlIG92ZXJ3cml0ZW4gYnkgcGFzc2luZ1xuICAvLyBvcHRpb25zLnZhbGlkYXRlXG4gIC8vXG4gIC8vIGlmIGB2YWxpZGF0ZWAgcmV0dXJucyBub3RoaW5nLCB0aGUgcGFzc2VkIG9iamVjdCBpc1xuICAvLyB2YWxpZC4gT3RoZXJ3aXNlIGl0IHJldHVybnMgYW4gZXJyb3JcbiAgLy9cbiAgYXBpLnZhbGlkYXRlID0gb3B0aW9ucy52YWxpZGF0ZTtcblxuICBpZiAoIW9wdGlvbnMudmFsaWRhdGUpIHtcbiAgICBhcGkudmFsaWRhdGUgPSBmdW5jdGlvbihvYmplY3QgLyosIG9wdGlvbnMgKi8gKSB7XG5cbiAgICAgIGlmICghb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgSG9vZGllRXJyb3Ioe1xuICAgICAgICAgIG5hbWU6ICdJbnZhbGlkT2JqZWN0RXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBvYmplY3QgcGFzc2VkLidcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChIb29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkKG9iamVjdC50eXBlLCB2YWxpZElkT3JUeXBlUGF0dGVybikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVPYmplY3RUeXBlRXJyb3Ioe1xuICAgICAgICAgIHR5cGU6IG9iamVjdC50eXBlLFxuICAgICAgICAgIHJ1bGVzOiB2YWxpZElkT3JUeXBlUnVsZXNcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghb2JqZWN0LmlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKEhvb2RpZU9iamVjdElkRXJyb3IuaXNJbnZhbGlkKG9iamVjdC5pZCwgdmFsaWRJZE9yVHlwZVBhdHRlcm4pKSB7XG4gICAgICAgIHJldHVybiBuZXcgSG9vZGllT2JqZWN0SWRFcnJvcih7XG4gICAgICAgICAgaWQ6IG9iamVjdC5pZCxcbiAgICAgICAgICBydWxlczogdmFsaWRJZE9yVHlwZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcblxuICB9XG5cbiAgLy8gU2F2ZVxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGNyZWF0ZXMgb3IgcmVwbGFjZXMgYW4gYW4gZXZlbnR1YWxseSBleGlzdGluZyBvYmplY3QgaW4gdGhlIHN0b3JlXG4gIC8vIHdpdGggc2FtZSB0eXBlICYgaWQuXG4gIC8vXG4gIC8vIFdoZW4gaWQgaXMgdW5kZWZpbmVkLCBpdCBnZXRzIGdlbmVyYXRlZCBhbmQgYSBuZXcgb2JqZWN0IGdldHMgc2F2ZWRcbiAgLy9cbiAgLy8gZXhhbXBsZSB1c2FnZTpcbiAgLy9cbiAgLy8gICAgIHN0b3JlLnNhdmUoJ2NhcicsIHVuZGVmaW5lZCwge2NvbG9yOiAncmVkJ30pXG4gIC8vICAgICBzdG9yZS5zYXZlKCdjYXInLCAnYWJjNDU2NycsIHtjb2xvcjogJ3JlZCd9KVxuICAvL1xuICBhcGkuc2F2ZSA9IGZ1bmN0aW9uIHNhdmUodHlwZSwgaWQsIHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcblxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHRydWUsIHt9LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIGRvbid0IG1lc3Mgd2l0aCBwYXNzZWQgb2JqZWN0XG4gICAgdmFyIG9iamVjdCA9IGV4dGVuZCh0cnVlLCB7fSwgcHJvcGVydGllcywge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIGlkOiBpZFxuICAgIH0pO1xuXG4gICAgLy8gdmFsaWRhdGlvbnNcbiAgICB2YXIgZXJyb3IgPSBhcGkudmFsaWRhdGUob2JqZWN0LCBvcHRpb25zIHx8IHt9KTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhvb2RpZS5yZWplY3RXaXRoKGVycm9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQuc2F2ZShvYmplY3QsIG9wdGlvbnMgfHwge30pKTtcbiAgfTtcblxuXG4gIC8vIEFkZFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gYC5hZGRgIGlzIGFuIGFsaWFzIGZvciBgLnNhdmVgLCB3aXRoIHRoZSBkaWZmZXJlbmNlIHRoYXQgdGhlcmUgaXMgbm8gaWQgYXJndW1lbnQuXG4gIC8vIEludGVybmFsbHkgaXQgc2ltcGx5IGNhbGxzIGAuc2F2ZSh0eXBlLCB1bmRlZmluZWQsIG9iamVjdCkuXG4gIC8vXG4gIGFwaS5hZGQgPSBmdW5jdGlvbiBhZGQodHlwZSwgcHJvcGVydGllcywgb3B0aW9ucykge1xuXG4gICAgaWYgKHByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGFwaS5zYXZlKHR5cGUsIHByb3BlcnRpZXMuaWQsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICB9O1xuXG5cbiAgLy8gZmluZFxuICAvLyAtLS0tLS1cblxuICAvL1xuICBhcGkuZmluZCA9IGZ1bmN0aW9uIGZpbmQodHlwZSwgaWQpIHtcblxuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoYmFja2VuZC5maW5kKHR5cGUsIGlkKSk7XG4gIH07XG5cblxuICAvLyBmaW5kIG9yIGFkZFxuICAvLyAtLS0tLS0tLS0tLS0tXG5cbiAgLy8gMS4gVHJ5IHRvIGZpbmQgYSBzaGFyZSBieSBnaXZlbiBpZFxuICAvLyAyLiBJZiBzaGFyZSBjb3VsZCBiZSBmb3VuZCwgcmV0dXJuIGl0XG4gIC8vIDMuIElmIG5vdCwgYWRkIG9uZSBhbmQgcmV0dXJuIGl0LlxuICAvL1xuICBhcGkuZmluZE9yQWRkID0gZnVuY3Rpb24gZmluZE9yQWRkKHR5cGUsIGlkLCBwcm9wZXJ0aWVzKSB7XG5cbiAgICBpZiAocHJvcGVydGllcyA9PT0gbnVsbCkge1xuICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZU5vdEZvdW5kKCkge1xuICAgICAgdmFyIG5ld1Byb3BlcnRpZXM7XG4gICAgICBuZXdQcm9wZXJ0aWVzID0gZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgaWQ6IGlkXG4gICAgICB9LCBwcm9wZXJ0aWVzKTtcbiAgICAgIHJldHVybiBhcGkuYWRkKHR5cGUsIG5ld1Byb3BlcnRpZXMpO1xuICAgIH1cblxuICAgIC8vIHByb21pc2UgZGVjb3JhdGlvbnMgZ2V0IGxvc3Qgd2hlbiBwaXBlZCB0aHJvdWdoIGB0aGVuYCxcbiAgICAvLyB0aGF0J3Mgd2h5IHdlIG5lZWQgdG8gZGVjb3JhdGUgdGhlIGZpbmQncyBwcm9taXNlIGFnYWluLlxuICAgIHZhciBwcm9taXNlID0gYXBpLmZpbmQodHlwZSwgaWQpLnRoZW4obnVsbCwgaGFuZGxlTm90Rm91bmQpO1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSk7XG4gIH07XG5cblxuICAvLyBmaW5kQWxsXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIHJldHVybnMgYWxsIG9iamVjdHMgZnJvbSBzdG9yZS5cbiAgLy8gQ2FuIGJlIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSB0eXBlIG9yIGEgZnVuY3Rpb25cbiAgLy9cbiAgYXBpLmZpbmRBbGwgPSBmdW5jdGlvbiBmaW5kQWxsKHR5cGUsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKCBiYWNrZW5kLmZpbmRBbGwodHlwZSwgb3B0aW9ucykgKTtcbiAgfTtcblxuXG4gIC8vIFVwZGF0ZVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gSW4gY29udHJhc3QgdG8gYC5zYXZlYCwgdGhlIGAudXBkYXRlYCBtZXRob2QgZG9lcyBub3QgcmVwbGFjZSB0aGUgc3RvcmVkIG9iamVjdCxcbiAgLy8gYnV0IG9ubHkgY2hhbmdlcyB0aGUgcGFzc2VkIGF0dHJpYnV0ZXMgb2YgYW4gZXhzdGluZyBvYmplY3QsIGlmIGl0IGV4aXN0c1xuICAvL1xuICAvLyBib3RoIGEgaGFzaCBvZiBrZXkvdmFsdWVzIG9yIGEgZnVuY3Rpb24gdGhhdCBhcHBsaWVzIHRoZSB1cGRhdGUgdG8gdGhlIHBhc3NlZFxuICAvLyBvYmplY3QgY2FuIGJlIHBhc3NlZC5cbiAgLy9cbiAgLy8gZXhhbXBsZSB1c2FnZVxuICAvL1xuICAvLyBob29kaWUuc3RvcmUudXBkYXRlKCdjYXInLCAnYWJjNDU2NycsIHtzb2xkOiB0cnVlfSlcbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZSgnY2FyJywgJ2FiYzQ1NjcnLCBmdW5jdGlvbihvYmopIHsgb2JqLnNvbGQgPSB0cnVlIH0pXG4gIC8vXG4gIGFwaS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykge1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlRm91bmQoY3VycmVudE9iamVjdCkge1xuICAgICAgdmFyIGNoYW5nZWRQcm9wZXJ0aWVzLCBuZXdPYmosIHZhbHVlO1xuXG4gICAgICAvLyBub3JtYWxpemUgaW5wdXRcbiAgICAgIG5ld09iaiA9IGV4dGVuZCh0cnVlLCB7fSwgY3VycmVudE9iamVjdCk7XG5cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0VXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iamVjdFVwZGF0ZSA9IG9iamVjdFVwZGF0ZShuZXdPYmopO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9iamVjdFVwZGF0ZSkge1xuICAgICAgICByZXR1cm4gaG9vZGllLnJlc29sdmVXaXRoKGN1cnJlbnRPYmplY3QpO1xuICAgICAgfVxuXG4gICAgICAvLyBjaGVjayBpZiBzb21ldGhpbmcgY2hhbmdlZFxuICAgICAgY2hhbmdlZFByb3BlcnRpZXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RVcGRhdGUpIHtcbiAgICAgICAgICBpZiAob2JqZWN0VXBkYXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0VXBkYXRlW2tleV07XG4gICAgICAgICAgICBpZiAoKGN1cnJlbnRPYmplY3Rba2V5XSAhPT0gdmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgZm9yIHVuZGVmaW5lZCB2YWx1ZXMsIGFzIGV4dGVuZCBpZ25vcmVzIHRoZXNlXG4gICAgICAgICAgICBuZXdPYmpba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgX3Jlc3VsdHMucHVzaChrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX3Jlc3VsdHM7XG4gICAgICB9KSgpO1xuXG4gICAgICBpZiAoIShjaGFuZ2VkUHJvcGVydGllcy5sZW5ndGggfHwgb3B0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIGhvb2RpZS5yZXNvbHZlV2l0aChuZXdPYmopO1xuICAgICAgfVxuXG4gICAgICAvL2FwcGx5IHVwZGF0ZVxuICAgICAgcmV0dXJuIGFwaS5zYXZlKHR5cGUsIGlkLCBuZXdPYmosIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIHByb21pc2UgZGVjb3JhdGlvbnMgZ2V0IGxvc3Qgd2hlbiBwaXBlZCB0aHJvdWdoIGB0aGVuYCxcbiAgICAvLyB0aGF0J3Mgd2h5IHdlIG5lZWQgdG8gZGVjb3JhdGUgdGhlIGZpbmQncyBwcm9taXNlIGFnYWluLlxuICAgIHZhciBwcm9taXNlID0gYXBpLmZpbmQodHlwZSwgaWQpLnRoZW4oaGFuZGxlRm91bmQpO1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSk7XG4gIH07XG5cblxuICAvLyB1cGRhdGVPckFkZFxuICAvLyAtLS0tLS0tLS0tLS0tXG5cbiAgLy8gc2FtZSBhcyBgLnVwZGF0ZSgpYCwgYnV0IGluIGNhc2UgdGhlIG9iamVjdCBjYW5ub3QgYmUgZm91bmQsXG4gIC8vIGl0IGdldHMgY3JlYXRlZFxuICAvL1xuICBhcGkudXBkYXRlT3JBZGQgPSBmdW5jdGlvbiB1cGRhdGVPckFkZCh0eXBlLCBpZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSB7XG4gICAgZnVuY3Rpb24gaGFuZGxlTm90Rm91bmQoKSB7XG4gICAgICB2YXIgcHJvcGVydGllcyA9IGV4dGVuZCh0cnVlLCB7fSwgb2JqZWN0VXBkYXRlLCB7XG4gICAgICAgIGlkOiBpZFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBhcGkuYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHZhciBwcm9taXNlID0gYXBpLnVwZGF0ZSh0eXBlLCBpZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKS50aGVuKG51bGwsIGhhbmRsZU5vdEZvdW5kKTtcblxuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSk7XG4gIH07XG5cblxuICAvLyB1cGRhdGVBbGxcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyB1cGRhdGUgYWxsIG9iamVjdHMgaW4gdGhlIHN0b3JlLCBjYW4gYmUgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIGZ1bmN0aW9uXG4gIC8vIEFzIGFuIGFsdGVybmF0aXZlLCBhbiBhcnJheSBvZiBvYmplY3RzIGNhbiBiZSBwYXNzZWRcbiAgLy9cbiAgLy8gZXhhbXBsZSB1c2FnZVxuICAvL1xuICAvLyBob29kaWUuc3RvcmUudXBkYXRlQWxsKClcbiAgLy9cbiAgYXBpLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uIHVwZGF0ZUFsbChmaWx0ZXJPck9iamVjdHMsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykge1xuICAgIHZhciBwcm9taXNlO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAvLyBub3JtYWxpemUgdGhlIGlucHV0OiBtYWtlIHN1cmUgd2UgaGF2ZSBhbGwgb2JqZWN0c1xuICAgIHN3aXRjaCAodHJ1ZSkge1xuICAgIGNhc2UgdHlwZW9mIGZpbHRlck9yT2JqZWN0cyA9PT0gJ3N0cmluZyc6XG4gICAgICBwcm9taXNlID0gYXBpLmZpbmRBbGwoZmlsdGVyT3JPYmplY3RzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgaG9vZGllLmlzUHJvbWlzZShmaWx0ZXJPck9iamVjdHMpOlxuICAgICAgcHJvbWlzZSA9IGZpbHRlck9yT2JqZWN0cztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJC5pc0FycmF5KGZpbHRlck9yT2JqZWN0cyk6XG4gICAgICBwcm9taXNlID0gaG9vZGllLmRlZmVyKCkucmVzb2x2ZShmaWx0ZXJPck9iamVjdHMpLnByb21pc2UoKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBlLmcuIG51bGwsIHVwZGF0ZSBhbGxcbiAgICAgIHByb21pc2UgPSBhcGkuZmluZEFsbCgpO1xuICAgIH1cblxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oZnVuY3Rpb24ob2JqZWN0cykge1xuICAgICAgLy8gbm93IHdlIHVwZGF0ZSBhbGwgb2JqZWN0cyBvbmUgYnkgb25lIGFuZCByZXR1cm4gYSBwcm9taXNlXG4gICAgICAvLyB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgb25jZSBhbGwgdXBkYXRlcyBoYXZlIGJlZW4gZmluaXNoZWRcbiAgICAgIHZhciBvYmplY3QsIF91cGRhdGVQcm9taXNlcztcblxuICAgICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgICAgb2JqZWN0cyA9IFtvYmplY3RzXTtcbiAgICAgIH1cblxuICAgICAgX3VwZGF0ZVByb21pc2VzID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgICAgICBfcmVzdWx0cyA9IFtdO1xuICAgICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IG9iamVjdHMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgICAgICBfcmVzdWx0cy5wdXNoKGFwaS51cGRhdGUob2JqZWN0LnR5cGUsIG9iamVjdC5pZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXN1bHRzO1xuICAgICAgfSkoKTtcblxuICAgICAgcmV0dXJuICQud2hlbi5hcHBseShudWxsLCBfdXBkYXRlUHJvbWlzZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZShwcm9taXNlKTtcbiAgfTtcblxuXG4gIC8vIFJlbW92ZVxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBSZW1vdmVzIG9uZSBvYmplY3Qgc3BlY2lmaWVkIGJ5IGB0eXBlYCBhbmQgYGlkYC5cbiAgLy9cbiAgLy8gd2hlbiBvYmplY3QgaGFzIGJlZW4gc3luY2VkIGJlZm9yZSwgbWFyayBpdCBhcyBkZWxldGVkLlxuICAvLyBPdGhlcndpc2UgcmVtb3ZlIGl0IGZyb20gU3RvcmUuXG4gIC8vXG4gIGFwaS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUodHlwZSwgaWQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zIHx8IHt9KSk7XG4gIH07XG5cblxuICAvLyByZW1vdmVBbGxcbiAgLy8gLS0tLS0tLS0tLS1cblxuICAvLyBEZXN0cm95ZSBhbGwgb2JqZWN0cy4gQ2FuIGJlIGZpbHRlcmVkIGJ5IGEgdHlwZVxuICAvL1xuICBhcGkucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKHR5cGUsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjb3JhdGVQcm9taXNlKGJhY2tlbmQucmVtb3ZlQWxsKHR5cGUsIG9wdGlvbnMgfHwge30pKTtcbiAgfTtcblxuXG4gIC8vIGRlY29yYXRlIHByb21pc2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgcHJvbWlzZXMgcmV0dXJuZWQgYnkgc3RvcmUuYXBpXG4gIGFwaS5kZWNvcmF0ZVByb21pc2VzID0gZnVuY3Rpb24gZGVjb3JhdGVQcm9taXNlcyhtZXRob2RzKSB7XG4gICAgcmV0dXJuIGV4dGVuZChwcm9taXNlQXBpLCBtZXRob2RzKTtcbiAgfTtcblxuXG5cbiAgLy8gcmVxdWlyZWQgYmFja2VuZCBtZXRob2RzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgaWYgKCFvcHRpb25zLmJhY2tlbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMuYmFja2VuZCBtdXN0IGJlIHBhc3NlZCcpO1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkID0gJ3NhdmUgZmluZCBmaW5kQWxsIHJlbW92ZSByZW1vdmVBbGwnLnNwbGl0KCcgJyk7XG5cbiAgcmVxdWlyZWQuZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG5cbiAgICBpZiAoIW9wdGlvbnMuYmFja2VuZFttZXRob2ROYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvcHRpb25zLmJhY2tlbmQuJyArIG1ldGhvZE5hbWUgKyAnIG11c3QgYmUgcGFzc2VkLicpO1xuICAgIH1cblxuICAgIGJhY2tlbmRbbWV0aG9kTmFtZV0gPSBvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV07XG4gIH0pO1xuXG5cbiAgLy8gUHJpdmF0ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyAvIG5vdCBhbGxvd2VkIGZvciBpZFxuICB2YXIgdmFsaWRJZE9yVHlwZVBhdHRlcm4gPSAvXlteXFwvXSskLztcbiAgdmFyIHZhbGlkSWRPclR5cGVSdWxlcyA9ICcvIG5vdCBhbGxvd2VkJztcblxuICAvL1xuICBmdW5jdGlvbiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSkge1xuICAgIHJldHVybiBleHRlbmQocHJvbWlzZSwgcHJvbWlzZUFwaSk7XG4gIH1cblxuICByZXR1cm4gYXBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVN0b3JlQXBpO1xuIiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307Ly8gUmVtb3RlXG4vLyA9PT09PT09PVxuXG4vLyBDb25uZWN0aW9uIHRvIGEgcmVtb3RlIENvdWNoIERhdGFiYXNlLlxuLy9cbi8vIHN0b3JlIEFQSVxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuLy9cbi8vIG9iamVjdCBsb2FkaW5nIC8gdXBkYXRpbmcgLyBkZWxldGluZ1xuLy9cbi8vICogZmluZCh0eXBlLCBpZClcbi8vICogZmluZEFsbCh0eXBlIClcbi8vICogYWRkKHR5cGUsIG9iamVjdClcbi8vICogc2F2ZSh0eXBlLCBpZCwgb2JqZWN0KVxuLy8gKiB1cGRhdGUodHlwZSwgaWQsIG5ld19wcm9wZXJ0aWVzIClcbi8vICogdXBkYXRlQWxsKCB0eXBlLCBuZXdfcHJvcGVydGllcylcbi8vICogcmVtb3ZlKHR5cGUsIGlkKVxuLy8gKiByZW1vdmVBbGwodHlwZSlcbi8vXG4vLyBjdXN0b20gcmVxdWVzdHNcbi8vXG4vLyAqIHJlcXVlc3QodmlldywgcGFyYW1zKVxuLy8gKiBnZXQodmlldywgcGFyYW1zKVxuLy8gKiBwb3N0KHZpZXcsIHBhcmFtcylcbi8vXG4vLyBzeW5jaHJvbml6YXRpb25cbi8vXG4vLyAqIGNvbm5lY3QoKVxuLy8gKiBkaXNjb25uZWN0KClcbi8vICogcHVsbCgpXG4vLyAqIHB1c2goKVxuLy8gKiBzeW5jKClcbi8vXG4vLyBldmVudCBiaW5kaW5nXG4vL1xuLy8gKiBvbihldmVudCwgY2FsbGJhY2spXG4vL1xuXG52YXIgaG9vZGllU3RvcmVBcGkgPSByZXF1aXJlKCcuL2FwaScpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpO1xudmFyIGdlbmVyYXRlSWQgPSByZXF1aXJlKCcuLi8uLi91dGlscy9nZW5lcmF0ZV9pZCcpO1xuXG4vL1xuZnVuY3Rpb24gaG9vZGllUmVtb3RlU3RvcmUoaG9vZGllLCBvcHRpb25zKSB7XG5cbiAgdmFyIHJlbW90ZVN0b3JlID0ge307XG5cblxuICAvLyBSZW1vdGUgU3RvcmUgUGVyc2lzdGFuY2UgbWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZmluZFxuICAvLyAtLS0tLS1cblxuICAvLyBmaW5kIG9uZSBvYmplY3RcbiAgLy9cbiAgcmVtb3RlU3RvcmUuZmluZCA9IGZ1bmN0aW9uIGZpbmQodHlwZSwgaWQpIHtcbiAgICB2YXIgcGF0aDtcblxuICAgIHBhdGggPSB0eXBlICsgJy8nICsgaWQ7XG5cbiAgICBpZiAocmVtb3RlLnByZWZpeCkge1xuICAgICAgcGF0aCA9IHJlbW90ZS5wcmVmaXggKyBwYXRoO1xuICAgIH1cblxuICAgIHBhdGggPSAnLycgKyBlbmNvZGVVUklDb21wb25lbnQocGF0aCk7XG5cbiAgICByZXR1cm4gcmVtb3RlLnJlcXVlc3QoJ0dFVCcsIHBhdGgpLnRoZW4ocGFyc2VGcm9tUmVtb3RlKTtcbiAgfTtcblxuXG4gIC8vIGZpbmRBbGxcbiAgLy8gLS0tLS0tLS0tXG5cbiAgLy8gZmluZCBhbGwgb2JqZWN0cywgY2FuIGJlIGZpbGV0ZXJlZCBieSBhIHR5cGVcbiAgLy9cbiAgcmVtb3RlU3RvcmUuZmluZEFsbCA9IGZ1bmN0aW9uIGZpbmRBbGwodHlwZSkge1xuICAgIHZhciBlbmRrZXksIHBhdGgsIHN0YXJ0a2V5O1xuXG4gICAgcGF0aCA9ICcvX2FsbF9kb2NzP2luY2x1ZGVfZG9jcz10cnVlJztcblxuICAgIHN3aXRjaCAodHJ1ZSkge1xuICAgIGNhc2UgKHR5cGUgIT09IHVuZGVmaW5lZCkgJiYgcmVtb3RlLnByZWZpeCAhPT0gJyc6XG4gICAgICBzdGFydGtleSA9IHJlbW90ZS5wcmVmaXggKyB0eXBlICsgJy8nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0eXBlICE9PSB1bmRlZmluZWQ6XG4gICAgICBzdGFydGtleSA9IHR5cGUgKyAnLyc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIHJlbW90ZS5wcmVmaXggIT09ICcnOlxuICAgICAgc3RhcnRrZXkgPSByZW1vdGUucHJlZml4O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXJ0a2V5ID0gJyc7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0a2V5KSB7XG5cbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IG9ubHkgb2JqZWN0cyBzdGFydGluZyB3aXRoXG4gICAgICAvLyBgc3RhcnRrZXlgIHdpbGwgYmUgcmV0dXJuZWRcbiAgICAgIGVuZGtleSA9IHN0YXJ0a2V5LnJlcGxhY2UoLy4kLywgZnVuY3Rpb24oY2hhcnMpIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlO1xuICAgICAgICBjaGFyQ29kZSA9IGNoYXJzLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJDb2RlICsgMSk7XG4gICAgICB9KTtcbiAgICAgIHBhdGggPSAnJyArIHBhdGggKyAnJnN0YXJ0a2V5PVwiJyArIChlbmNvZGVVUklDb21wb25lbnQoc3RhcnRrZXkpKSArICdcIiZlbmRrZXk9XCInICsgKGVuY29kZVVSSUNvbXBvbmVudChlbmRrZXkpKSArICdcIic7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwYXRoKS50aGVuKG1hcERvY3NGcm9tRmluZEFsbCkudGhlbihwYXJzZUFsbEZyb21SZW1vdGUpO1xuICB9O1xuXG5cbiAgLy8gc2F2ZVxuICAvLyAtLS0tLS1cblxuICAvLyBzYXZlIGEgbmV3IG9iamVjdC4gSWYgaXQgZXhpc3RlZCBiZWZvcmUsIGFsbCBwcm9wZXJ0aWVzXG4gIC8vIHdpbGwgYmUgb3ZlcndyaXR0ZW5cbiAgLy9cbiAgcmVtb3RlU3RvcmUuc2F2ZSA9IGZ1bmN0aW9uIHNhdmUob2JqZWN0KSB7XG4gICAgdmFyIHBhdGg7XG5cbiAgICBpZiAoIW9iamVjdC5pZCkge1xuICAgICAgb2JqZWN0LmlkID0gZ2VuZXJhdGVJZCgpO1xuICAgIH1cblxuICAgIG9iamVjdCA9IHBhcnNlRm9yUmVtb3RlKG9iamVjdCk7XG4gICAgcGF0aCA9ICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChvYmplY3QuX2lkKTtcbiAgICByZXR1cm4gcmVtb3RlLnJlcXVlc3QoJ1BVVCcsIHBhdGgsIHtcbiAgICAgIGRhdGE6IG9iamVjdFxuICAgIH0pO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlXG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIHJlbW92ZSBvbmUgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZVN0b3JlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZSh0eXBlLCBpZCkge1xuICAgIHJldHVybiByZW1vdGUudXBkYXRlKHR5cGUsIGlkLCB7XG4gICAgICBfZGVsZXRlZDogdHJ1ZVxuICAgIH0pO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlQWxsXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIHJlbW92ZSBhbGwgb2JqZWN0cywgY2FuIGJlIGZpbHRlcmVkIGJ5IHR5cGVcbiAgLy9cbiAgcmVtb3RlU3RvcmUucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKHR5cGUpIHtcbiAgICByZXR1cm4gcmVtb3RlLnVwZGF0ZUFsbCh0eXBlLCB7XG4gICAgICBfZGVsZXRlZDogdHJ1ZVxuICAgIH0pO1xuICB9O1xuXG5cbiAgdmFyIHJlbW90ZSA9IGhvb2RpZVN0b3JlQXBpKGhvb2RpZSwge1xuXG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuXG4gICAgYmFja2VuZDoge1xuICAgICAgc2F2ZTogcmVtb3RlU3RvcmUuc2F2ZSxcbiAgICAgIGZpbmQ6IHJlbW90ZVN0b3JlLmZpbmQsXG4gICAgICBmaW5kQWxsOiByZW1vdGVTdG9yZS5maW5kQWxsLFxuICAgICAgcmVtb3ZlOiByZW1vdGVTdG9yZS5yZW1vdmUsXG4gICAgICByZW1vdmVBbGw6IHJlbW90ZVN0b3JlLnJlbW92ZUFsbFxuICAgIH1cbiAgfSk7XG5cblxuXG5cblxuICAvLyBwcm9wZXJ0aWVzXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIG5hbWVcblxuICAvLyB0aGUgbmFtZSBvZiB0aGUgUmVtb3RlIGlzIHRoZSBuYW1lIG9mIHRoZVxuICAvLyBDb3VjaERCIGRhdGFiYXNlIGFuZCBpcyBhbHNvIHVzZWQgdG8gcHJlZml4XG4gIC8vIHRyaWdnZXJlZCBldmVudHNcbiAgLy9cbiAgdmFyIHJlbW90ZU5hbWUgPSBudWxsO1xuXG5cbiAgLy8gc3luY1xuXG4gIC8vIGlmIHNldCB0byB0cnVlLCB1cGRhdGVzIHdpbGwgYmUgY29udGludW91c2x5IHB1bGxlZFxuICAvLyBhbmQgcHVzaGVkLiBBbHRlcm5hdGl2ZWx5LCBgc3luY2AgY2FuIGJlIHNldCB0b1xuICAvLyBgcHVsbDogdHJ1ZWAgb3IgYHB1c2g6IHRydWVgLlxuICAvL1xuICByZW1vdGUuY29ubmVjdGVkID0gZmFsc2U7XG5cblxuICAvLyBwcmVmaXhcblxuICAvLyBwcmVmaXggZm9yIGRvY3MgaW4gYSBDb3VjaERCIGRhdGFiYXNlLCBlLmcuIGFsbCBkb2NzXG4gIC8vIGluIHB1YmxpYyB1c2VyIHN0b3JlcyBhcmUgcHJlZml4ZWQgYnkgJyRwdWJsaWMvJ1xuICAvL1xuICByZW1vdGUucHJlZml4ID0gJyc7XG4gIHZhciByZW1vdGVQcmVmaXhQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXicpO1xuXG5cbiAgLy8gZGVmYXVsdHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vXG4gIGlmIChvcHRpb25zLm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW90ZU5hbWUgPSBvcHRpb25zLm5hbWU7XG4gIH1cblxuICBpZiAob3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW90ZS5wcmVmaXggPSBvcHRpb25zLnByZWZpeDtcbiAgICByZW1vdGVQcmVmaXhQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXicgKyByZW1vdGUucHJlZml4KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmJhc2VVcmwgIT09IG51bGwpIHtcbiAgICByZW1vdGUuYmFzZVVybCA9IG9wdGlvbnMuYmFzZVVybDtcbiAgfVxuXG5cbiAgLy8gcmVxdWVzdFxuICAvLyAtLS0tLS0tLS1cblxuICAvLyB3cmFwcGVyIGZvciBob29kaWUucmVxdWVzdCwgd2l0aCBzb21lIHN0b3JlIHNwZWNpZmljIGRlZmF1bHRzXG4gIC8vIGFuZCBhIHByZWZpeGVkIHBhdGhcbiAgLy9cbiAgcmVtb3RlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmIChyZW1vdGVOYW1lKSB7XG4gICAgICBwYXRoID0gJy8nICsgKGVuY29kZVVSSUNvbXBvbmVudChyZW1vdGVOYW1lKSkgKyBwYXRoO1xuICAgIH1cblxuICAgIGlmIChyZW1vdGUuYmFzZVVybCkge1xuICAgICAgcGF0aCA9ICcnICsgcmVtb3RlLmJhc2VVcmwgKyBwYXRoO1xuICAgIH1cblxuICAgIG9wdGlvbnMuY29udGVudFR5cGUgPSBvcHRpb25zLmNvbnRlbnRUeXBlIHx8ICdhcHBsaWNhdGlvbi9qc29uJztcblxuICAgIGlmICh0eXBlID09PSAnUE9TVCcgfHwgdHlwZSA9PT0gJ1BVVCcpIHtcbiAgICAgIG9wdGlvbnMuZGF0YVR5cGUgPSBvcHRpb25zLmRhdGFUeXBlIHx8ICdqc29uJztcbiAgICAgIG9wdGlvbnMucHJvY2Vzc0RhdGEgPSBvcHRpb25zLnByb2Nlc3NEYXRhIHx8IGZhbHNlO1xuICAgICAgb3B0aW9ucy5kYXRhID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5kYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGhvb2RpZS5yZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpO1xuICB9O1xuXG5cbiAgLy8gaXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBkZXRlcm1pbmUgYmV0d2VlbiBhIGtub3duIGFuZCBhIG5ldyBvYmplY3RcbiAgLy9cbiAgcmVtb3RlLmlzS25vd25PYmplY3QgPSBmdW5jdGlvbiBpc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuXG4gICAgaWYgKGtub3duT2JqZWN0c1trZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBrbm93bk9iamVjdHNba2V5XTtcbiAgICB9XG4gIH07XG5cblxuICAvLyBtYXJrQXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZGV0ZXJtaW5lIGJldHdlZW4gYSBrbm93biBhbmQgYSBuZXcgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZS5tYXJrQXNLbm93bk9iamVjdCA9IGZ1bmN0aW9uIG1hcmtBc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuICAgIGtub3duT2JqZWN0c1trZXldID0gMTtcbiAgICByZXR1cm4ga25vd25PYmplY3RzW2tleV07XG4gIH07XG5cblxuICAvLyBzeW5jaHJvbml6YXRpb25cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBDb25uZWN0XG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIHN0YXJ0IHN5bmNpbmcuIGByZW1vdGUuYm9vdHN0cmFwKClgIHdpbGwgYXV0b21hdGljYWxseSBzdGFydFxuICAvLyBwdWxsaW5nIHdoZW4gYHJlbW90ZS5jb25uZWN0ZWRgIHJlbWFpbnMgdHJ1ZS5cbiAgLy9cbiAgcmVtb3RlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgcmVtb3RlTmFtZSA9IG5hbWU7XG4gICAgfVxuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIHJlbW90ZS50cmlnZ2VyKCdjb25uZWN0Jyk7XG4gICAgcmV0dXJuIHJlbW90ZS5ib290c3RyYXAoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmVtb3RlLnB1c2goKTtcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIERpc2Nvbm5lY3RcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gc3RvcCBzeW5jaW5nIGNoYW5nZXMgZnJvbSByZW1vdGUgc3RvcmVcbiAgLy9cbiAgcmVtb3RlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignZGlzY29ubmVjdCcpOyAvLyBUT0RPOiBzcGVjIHRoYXRcbiAgICBpZiAocHVsbFJlcXVlc3QpIHtcbiAgICAgIHB1bGxSZXF1ZXN0LmFib3J0KCk7XG4gICAgfVxuXG4gICAgaWYgKHB1c2hSZXF1ZXN0KSB7XG4gICAgICBwdXNoUmVxdWVzdC5hYm9ydCgpO1xuICAgIH1cblxuICB9O1xuXG5cbiAgLy8gaXNDb25uZWN0ZWRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vXG4gIHJlbW90ZS5pc0Nvbm5lY3RlZCA9IGZ1bmN0aW9uIGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiByZW1vdGUuY29ubmVjdGVkO1xuICB9O1xuXG5cbiAgLy8gZ2V0U2luY2VOclxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyByZXR1cm5zIHRoZSBzZXF1ZW5jZSBudW1iZXIgZnJvbSB3aWNoIHRvIHN0YXJ0IHRvIGZpbmQgY2hhbmdlcyBpbiBwdWxsXG4gIC8vXG4gIHZhciBzaW5jZSA9IG9wdGlvbnMuc2luY2UgfHwgMDsgLy8gVE9ETzogc3BlYyB0aGF0IVxuICByZW1vdGUuZ2V0U2luY2VOciA9IGZ1bmN0aW9uIGdldFNpbmNlTnIoKSB7XG4gICAgaWYgKHR5cGVvZiBzaW5jZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHNpbmNlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpbmNlO1xuICB9O1xuXG5cbiAgLy8gYm9vdHN0cmFwXG4gIC8vIC0tLS0tLS0tLS0tXG5cbiAgLy8gaW5pdGFsIHB1bGwgb2YgZGF0YSBvZiB0aGUgcmVtb3RlIHN0b3JlLiBCeSBkZWZhdWx0LCB3ZSBwdWxsIGFsbFxuICAvLyBjaGFuZ2VzIHNpbmNlIHRoZSBiZWdpbm5pbmcsIGJ1dCB0aGlzIGJlaGF2aW9yIG1pZ2h0IGJlIGFkanVzdGVkLFxuICAvLyBlLmcgZm9yIGEgZmlsdGVyZWQgYm9vdHN0cmFwLlxuICAvL1xuICB2YXIgaXNCb290c3RyYXBwaW5nID0gZmFsc2U7XG4gIHJlbW90ZS5ib290c3RyYXAgPSBmdW5jdGlvbiBib290c3RyYXAoKSB7XG4gICAgaXNCb290c3RyYXBwaW5nID0gdHJ1ZTtcbiAgICByZW1vdGUudHJpZ2dlcignYm9vdHN0cmFwOnN0YXJ0Jyk7XG4gICAgcmV0dXJuIHJlbW90ZS5wdWxsKCkuZG9uZShoYW5kbGVCb290c3RyYXBTdWNjZXNzKS5mYWlsKGhhbmRsZUJvb3RzdHJhcEVycm9yKTtcbiAgfTtcblxuXG4gIC8vIHB1bGwgY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGEuay5hLiBtYWtlIGEgR0VUIHJlcXVlc3QgdG8gQ291Y2hEQidzIGBfY2hhbmdlc2AgZmVlZC5cbiAgLy8gV2UgY3VycmVudGx5IG1ha2UgbG9uZyBwb2xsIHJlcXVlc3RzLCB0aGF0IHdlIG1hbnVhbGx5IGFib3J0XG4gIC8vIGFuZCByZXN0YXJ0IGVhY2ggMjUgc2Vjb25kcy5cbiAgLy9cbiAgdmFyIHB1bGxSZXF1ZXN0LCBwdWxsUmVxdWVzdFRpbWVvdXQ7XG4gIHJlbW90ZS5wdWxsID0gZnVuY3Rpb24gcHVsbCgpIHtcbiAgICBwdWxsUmVxdWVzdCA9IHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwdWxsVXJsKCkpO1xuXG4gICAgaWYgKHJlbW90ZS5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICBnbG9iYWwuY2xlYXJUaW1lb3V0KHB1bGxSZXF1ZXN0VGltZW91dCk7XG4gICAgICBwdWxsUmVxdWVzdFRpbWVvdXQgPSBnbG9iYWwuc2V0VGltZW91dChyZXN0YXJ0UHVsbFJlcXVlc3QsIDI1MDAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHVsbFJlcXVlc3QuZG9uZShoYW5kbGVQdWxsU3VjY2VzcykuZmFpbChoYW5kbGVQdWxsRXJyb3IpO1xuICB9O1xuXG5cbiAgLy8gcHVzaCBjaGFuZ2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUHVzaCBvYmplY3RzIHRvIHJlbW90ZSBzdG9yZSB1c2luZyB0aGUgYF9idWxrX2RvY3NgIEFQSS5cbiAgLy9cbiAgdmFyIHB1c2hSZXF1ZXN0O1xuICByZW1vdGUucHVzaCA9IGZ1bmN0aW9uIHB1c2gob2JqZWN0cykge1xuICAgIHZhciBvYmplY3QsIG9iamVjdHNGb3JSZW1vdGUsIF9pLCBfbGVuO1xuXG4gICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgIG9iamVjdHMgPSBkZWZhdWx0T2JqZWN0c1RvUHVzaCgpO1xuICAgIH1cblxuICAgIGlmIChvYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhvb2RpZS5yZXNvbHZlV2l0aChbXSk7XG4gICAgfVxuXG4gICAgb2JqZWN0c0ZvclJlbW90ZSA9IFtdO1xuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBvYmplY3RzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG5cbiAgICAgIC8vIGRvbid0IG1lc3Mgd2l0aCBvcmlnaW5hbCBvYmplY3RzXG4gICAgICBvYmplY3QgPSBleHRlbmQodHJ1ZSwge30sIG9iamVjdHNbX2ldKTtcbiAgICAgIGFkZFJldmlzaW9uVG8ob2JqZWN0KTtcbiAgICAgIG9iamVjdCA9IHBhcnNlRm9yUmVtb3RlKG9iamVjdCk7XG4gICAgICBvYmplY3RzRm9yUmVtb3RlLnB1c2gob2JqZWN0KTtcbiAgICB9XG4gICAgcHVzaFJlcXVlc3QgPSByZW1vdGUucmVxdWVzdCgnUE9TVCcsICcvX2J1bGtfZG9jcycsIHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgZG9jczogb2JqZWN0c0ZvclJlbW90ZSxcbiAgICAgICAgbmV3X2VkaXRzOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcHVzaFJlcXVlc3QuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZW1vdGUudHJpZ2dlcigncHVzaCcsIG9iamVjdHNbaV0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBwdXNoUmVxdWVzdDtcbiAgfTtcblxuICAvLyBzeW5jIGNoYW5nZXNcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBwdXNoIG9iamVjdHMsIHRoZW4gcHVsbCB1cGRhdGVzLlxuICAvL1xuICByZW1vdGUuc3luYyA9IGZ1bmN0aW9uIHN5bmMob2JqZWN0cykge1xuICAgIHJldHVybiByZW1vdGUucHVzaChvYmplY3RzKS50aGVuKHJlbW90ZS5wdWxsKTtcbiAgfTtcblxuICAvL1xuICAvLyBQcml2YXRlXG4gIC8vIC0tLS0tLS0tLVxuICAvL1xuXG4gIC8vIGluIG9yZGVyIHRvIGRpZmZlcmVudGlhdGUgd2hldGhlciBhbiBvYmplY3QgZnJvbSByZW1vdGUgc2hvdWxkIHRyaWdnZXIgYSAnbmV3J1xuICAvLyBvciBhbiAndXBkYXRlJyBldmVudCwgd2Ugc3RvcmUgYSBoYXNoIG9mIGtub3duIG9iamVjdHNcbiAgdmFyIGtub3duT2JqZWN0cyA9IHt9O1xuXG5cbiAgLy8gdmFsaWQgQ291Y2hEQiBkb2MgYXR0cmlidXRlcyBzdGFydGluZyB3aXRoIGFuIHVuZGVyc2NvcmVcbiAgLy9cbiAgdmFyIHZhbGlkU3BlY2lhbEF0dHJpYnV0ZXMgPSBbJ19pZCcsICdfcmV2JywgJ19kZWxldGVkJywgJ19yZXZpc2lvbnMnLCAnX2F0dGFjaG1lbnRzJ107XG5cblxuICAvLyBkZWZhdWx0IG9iamVjdHMgdG8gcHVzaFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHdoZW4gcHVzaGVkIHdpdGhvdXQgcGFzc2luZyBhbnkgb2JqZWN0cywgdGhlIG9iamVjdHMgcmV0dXJuZWQgZnJvbVxuICAvLyB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhc3NlZC4gSXQgY2FuIGJlIG92ZXJ3cml0dGVuIGJ5IHBhc3NpbmcgYW5cbiAgLy8gYXJyYXkgb2Ygb2JqZWN0cyBvciBhIGZ1bmN0aW9uIGFzIGBvcHRpb25zLm9iamVjdHNgXG4gIC8vXG4gIHZhciBkZWZhdWx0T2JqZWN0c1RvUHVzaCA9IGZ1bmN0aW9uIGRlZmF1bHRPYmplY3RzVG9QdXNoKCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH07XG4gIGlmIChvcHRpb25zLmRlZmF1bHRPYmplY3RzVG9QdXNoKSB7XG4gICAgaWYgKCQuaXNBcnJheShvcHRpb25zLmRlZmF1bHRPYmplY3RzVG9QdXNoKSkge1xuICAgICAgZGVmYXVsdE9iamVjdHNUb1B1c2ggPSBmdW5jdGlvbiBkZWZhdWx0T2JqZWN0c1RvUHVzaCgpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2g7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWZhdWx0T2JqZWN0c1RvUHVzaCA9IG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2g7XG4gICAgfVxuICB9XG5cblxuICAvLyBzZXRTaW5jZU5yXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIHNldHMgdGhlIHNlcXVlbmNlIG51bWJlciBmcm9tIHdpY2ggdG8gc3RhcnQgdG8gZmluZCBjaGFuZ2VzIGluIHB1bGwuXG4gIC8vIElmIHJlbW90ZSBzdG9yZSB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBzaW5jZSA6IGZ1bmN0aW9uKG5yKSB7IC4uLiB9LFxuICAvLyBjYWxsIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSBzZXEgcGFzc2VkLiBPdGhlcndpc2Ugc2ltcGx5IHNldCB0aGUgc2VxXG4gIC8vIG51bWJlciBhbmQgcmV0dXJuIGl0LlxuICAvL1xuICBmdW5jdGlvbiBzZXRTaW5jZU5yKHNlcSkge1xuICAgIGlmICh0eXBlb2Ygc2luY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBzaW5jZShzZXEpO1xuICAgIH1cblxuICAgIHNpbmNlID0gc2VxO1xuICAgIHJldHVybiBzaW5jZTtcbiAgfVxuXG5cbiAgLy8gUGFyc2UgZm9yIHJlbW90ZVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBwYXJzZSBvYmplY3QgZm9yIHJlbW90ZSBzdG9yYWdlLiBBbGwgcHJvcGVydGllcyBzdGFydGluZyB3aXRoIGFuXG4gIC8vIGB1bmRlcnNjb3JlYCBkbyBub3QgZ2V0IHN5bmNocm9uaXplZCBkZXNwaXRlIHRoZSBzcGVjaWFsIHByb3BlcnRpZXNcbiAgLy8gYF9pZGAsIGBfcmV2YCBhbmQgYF9kZWxldGVkYCAoc2VlIGFib3ZlKVxuICAvL1xuICAvLyBBbHNvIGBpZGAgZ2V0cyByZXBsYWNlZCB3aXRoIGBfaWRgIHdoaWNoIGNvbnNpc3RzIG9mIHR5cGUgJiBpZFxuICAvL1xuICBmdW5jdGlvbiBwYXJzZUZvclJlbW90ZShvYmplY3QpIHtcbiAgICB2YXIgYXR0ciwgcHJvcGVydGllcztcbiAgICBwcm9wZXJ0aWVzID0gZXh0ZW5kKHt9LCBvYmplY3QpO1xuXG4gICAgZm9yIChhdHRyIGluIHByb3BlcnRpZXMpIHtcbiAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGF0dHIpKSB7XG4gICAgICAgIGlmICh2YWxpZFNwZWNpYWxBdHRyaWJ1dGVzLmluZGV4T2YoYXR0cikgIT09IC0xKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEvXl8vLnRlc3QoYXR0cikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcHJvcGVydGllc1thdHRyXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwcmVwYXJlIENvdWNoREIgaWRcbiAgICBwcm9wZXJ0aWVzLl9pZCA9ICcnICsgcHJvcGVydGllcy50eXBlICsgJy8nICsgcHJvcGVydGllcy5pZDtcbiAgICBpZiAocmVtb3RlLnByZWZpeCkge1xuICAgICAgcHJvcGVydGllcy5faWQgPSAnJyArIHJlbW90ZS5wcmVmaXggKyBwcm9wZXJ0aWVzLl9pZDtcbiAgICB9XG4gICAgZGVsZXRlIHByb3BlcnRpZXMuaWQ7XG4gICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gIH1cblxuXG4gIC8vICMjIyBfcGFyc2VGcm9tUmVtb3RlXG5cbiAgLy8gbm9ybWFsaXplIG9iamVjdHMgY29taW5nIGZyb20gcmVtb3RlXG4gIC8vXG4gIC8vIHJlbmFtZXMgYF9pZGAgYXR0cmlidXRlIHRvIGBpZGAgYW5kIHJlbW92ZXMgdGhlIHR5cGUgZnJvbSB0aGUgaWQsXG4gIC8vIGUuZy4gYHR5cGUvMTIzYCAtPiBgMTIzYFxuICAvL1xuICBmdW5jdGlvbiBwYXJzZUZyb21SZW1vdGUob2JqZWN0KSB7XG4gICAgdmFyIGlkLCBpZ25vcmUsIF9yZWY7XG5cbiAgICAvLyBoYW5kbGUgaWQgYW5kIHR5cGVcbiAgICBpZCA9IG9iamVjdC5faWQgfHwgb2JqZWN0LmlkO1xuICAgIGRlbGV0ZSBvYmplY3QuX2lkO1xuXG4gICAgaWYgKHJlbW90ZS5wcmVmaXgpIHtcbiAgICAgIGlkID0gaWQucmVwbGFjZShyZW1vdGVQcmVmaXhQYXR0ZXJuLCAnJyk7XG4gICAgICAvLyBpZCA9IGlkLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyByZW1vdGUucHJlZml4KSwgJycpO1xuICAgIH1cblxuICAgIC8vIHR1cm4gZG9jLzEyMyBpbnRvIHR5cGUgPSBkb2MgJiBpZCA9IDEyM1xuICAgIC8vIE5PVEU6IHdlIGRvbid0IHVzZSBhIHNpbXBsZSBpZC5zcGxpdCgvXFwvLykgaGVyZSxcbiAgICAvLyBhcyBpbiBzb21lIGNhc2VzIElEcyBtaWdodCBjb250YWluICcvJywgdG9vXG4gICAgLy9cbiAgICBfcmVmID0gaWQubWF0Y2goLyhbXlxcL10rKVxcLyguKikvKSwgaWdub3JlID0gX3JlZlswXSwgb2JqZWN0LnR5cGUgPSBfcmVmWzFdLCBvYmplY3QuaWQgPSBfcmVmWzJdO1xuXG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlQWxsRnJvbVJlbW90ZShvYmplY3RzKSB7XG4gICAgdmFyIG9iamVjdCwgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgIF9yZXN1bHRzID0gW107XG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBvYmplY3RzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgIF9yZXN1bHRzLnB1c2gocGFyc2VGcm9tUmVtb3RlKG9iamVjdCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH1cblxuXG4gIC8vICMjIyBfYWRkUmV2aXNpb25Ub1xuXG4gIC8vIGV4dGVuZHMgcGFzc2VkIG9iamVjdCB3aXRoIGEgX3JldiBwcm9wZXJ0eVxuICAvL1xuICBmdW5jdGlvbiBhZGRSZXZpc2lvblRvKGF0dHJpYnV0ZXMpIHtcbiAgICB2YXIgY3VycmVudFJldklkLCBjdXJyZW50UmV2TnIsIG5ld1JldmlzaW9uSWQsIF9yZWY7XG4gICAgdHJ5IHtcbiAgICAgIF9yZWYgPSBhdHRyaWJ1dGVzLl9yZXYuc3BsaXQoLy0vKSwgY3VycmVudFJldk5yID0gX3JlZlswXSwgY3VycmVudFJldklkID0gX3JlZlsxXTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHt9XG4gICAgY3VycmVudFJldk5yID0gcGFyc2VJbnQoY3VycmVudFJldk5yLCAxMCkgfHwgMDtcbiAgICBuZXdSZXZpc2lvbklkID0gZ2VuZXJhdGVOZXdSZXZpc2lvbklkKCk7XG5cbiAgICAvLyBsb2NhbCBjaGFuZ2VzIGFyZSBub3QgbWVhbnQgdG8gYmUgcmVwbGljYXRlZCBvdXRzaWRlIG9mIHRoZVxuICAgIC8vIHVzZXJzIGRhdGFiYXNlLCB0aGVyZWZvcmUgdGhlIGAtbG9jYWxgIHN1ZmZpeC5cbiAgICBpZiAoYXR0cmlidXRlcy5fJGxvY2FsKSB7XG4gICAgICBuZXdSZXZpc2lvbklkICs9ICctbG9jYWwnO1xuICAgIH1cblxuICAgIGF0dHJpYnV0ZXMuX3JldiA9ICcnICsgKGN1cnJlbnRSZXZOciArIDEpICsgJy0nICsgbmV3UmV2aXNpb25JZDtcbiAgICBhdHRyaWJ1dGVzLl9yZXZpc2lvbnMgPSB7XG4gICAgICBzdGFydDogMSxcbiAgICAgIGlkczogW25ld1JldmlzaW9uSWRdXG4gICAgfTtcblxuICAgIGlmIChjdXJyZW50UmV2SWQpIHtcbiAgICAgIGF0dHJpYnV0ZXMuX3JldmlzaW9ucy5zdGFydCArPSBjdXJyZW50UmV2TnI7XG4gICAgICByZXR1cm4gYXR0cmlidXRlcy5fcmV2aXNpb25zLmlkcy5wdXNoKGN1cnJlbnRSZXZJZCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgZ2VuZXJhdGUgbmV3IHJldmlzaW9uIGlkXG5cbiAgLy9cbiAgZnVuY3Rpb24gZ2VuZXJhdGVOZXdSZXZpc2lvbklkKCkge1xuICAgIHJldHVybiBnZW5lcmF0ZUlkKDkpO1xuICB9XG5cblxuICAvLyAjIyMgbWFwIGRvY3MgZnJvbSBmaW5kQWxsXG5cbiAgLy9cbiAgZnVuY3Rpb24gbWFwRG9jc0Zyb21GaW5kQWxsKHJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIHJlc3BvbnNlLnJvd3MubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmV0dXJuIHJvdy5kb2M7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8vICMjIyBwdWxsIHVybFxuXG4gIC8vIERlcGVuZGluZyBvbiB3aGV0aGVyIHJlbW90ZSBpcyBjb25uZWN0ZWQgKD0gcHVsbGluZyBjaGFuZ2VzIGNvbnRpbnVvdXNseSlcbiAgLy8gcmV0dXJuIGEgbG9uZ3BvbGwgVVJMIG9yIG5vdC4gSWYgaXQgaXMgYSBiZWdpbm5pbmcgYm9vdHN0cmFwIHJlcXVlc3QsIGRvXG4gIC8vIG5vdCByZXR1cm4gYSBsb25ncG9sbCBVUkwsIGFzIHdlIHdhbnQgaXQgdG8gZmluaXNoIHJpZ2h0IGF3YXksIGV2ZW4gaWYgdGhlcmVcbiAgLy8gYXJlIG5vIGNoYW5nZXMgb24gcmVtb3RlLlxuICAvL1xuICBmdW5jdGlvbiBwdWxsVXJsKCkge1xuICAgIHZhciBzaW5jZTtcbiAgICBzaW5jZSA9IHJlbW90ZS5nZXRTaW5jZU5yKCk7XG4gICAgaWYgKHJlbW90ZS5pc0Nvbm5lY3RlZCgpICYmICFpc0Jvb3RzdHJhcHBpbmcpIHtcbiAgICAgIHJldHVybiAnL19jaGFuZ2VzP2luY2x1ZGVfZG9jcz10cnVlJnNpbmNlPScgKyBzaW5jZSArICcmaGVhcnRiZWF0PTEwMDAwJmZlZWQ9bG9uZ3BvbGwnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJy9fY2hhbmdlcz9pbmNsdWRlX2RvY3M9dHJ1ZSZzaW5jZT0nICsgc2luY2U7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcmVzdGFydCBwdWxsIHJlcXVlc3RcblxuICAvLyByZXF1ZXN0IGdldHMgcmVzdGFydGVkIGF1dG9tYXRpY2NhbGx5XG4gIC8vIHdoZW4gYWJvcnRlZCAoc2VlIGhhbmRsZVB1bGxFcnJvcilcbiAgZnVuY3Rpb24gcmVzdGFydFB1bGxSZXF1ZXN0KCkge1xuICAgIGlmIChwdWxsUmVxdWVzdCkge1xuICAgICAgcHVsbFJlcXVlc3QuYWJvcnQoKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vICMjIyBwdWxsIHN1Y2Nlc3MgaGFuZGxlclxuXG4gIC8vIHJlcXVlc3QgZ2V0cyByZXN0YXJ0ZWQgYXV0b21hdGljY2FsbHlcbiAgLy8gd2hlbiBhYm9ydGVkIChzZWUgaGFuZGxlUHVsbEVycm9yKVxuICAvL1xuICBmdW5jdGlvbiBoYW5kbGVQdWxsU3VjY2VzcyhyZXNwb25zZSkge1xuICAgIHNldFNpbmNlTnIocmVzcG9uc2UubGFzdF9zZXEpO1xuICAgIGhhbmRsZVB1bGxSZXN1bHRzKHJlc3BvbnNlLnJlc3VsdHMpO1xuICAgIGlmIChyZW1vdGUuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgcmV0dXJuIHJlbW90ZS5wdWxsKCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcHVsbCBlcnJvciBoYW5kbGVyXG5cbiAgLy8gd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSwgdHJpZ2dlciBldmVudCxcbiAgLy8gdGhlbiBjaGVjayBmb3IgYW5vdGhlciBjaGFuZ2VcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUHVsbEVycm9yKHhociwgZXJyb3IpIHtcbiAgICBpZiAoIXJlbW90ZS5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoICh4aHIuc3RhdHVzKSB7XG4gICAgICAvLyBTZXNzaW9uIGlzIGludmFsaWQuIFVzZXIgaXMgc3RpbGwgbG9naW4sIGJ1dCBuZWVkcyB0byByZWF1dGhlbnRpY2F0ZVxuICAgICAgLy8gYmVmb3JlIHN5bmMgY2FuIGJlIGNvbnRpbnVlZFxuICAgIGNhc2UgNDAxOlxuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2Vycm9yOnVuYXV0aGVudGljYXRlZCcsIGVycm9yKTtcbiAgICAgIHJldHVybiByZW1vdGUuZGlzY29ubmVjdCgpO1xuXG4gICAgICAvLyB0aGUgNDA0IGNvbWVzLCB3aGVuIHRoZSByZXF1ZXN0ZWQgREIgaGFzIGJlZW4gcmVtb3ZlZFxuICAgICAgLy8gb3IgZG9lcyBub3QgZXhpc3QgeWV0LlxuICAgICAgLy9cbiAgICAgIC8vIEJVVDogaXQgbWlnaHQgYWxzbyBoYXBwZW4gdGhhdCB0aGUgYmFja2dyb3VuZCB3b3JrZXJzIGRpZFxuICAgICAgLy8gICAgICBub3QgY3JlYXRlIGEgcGVuZGluZyBkYXRhYmFzZSB5ZXQuIFRoZXJlZm9yZSxcbiAgICAgIC8vICAgICAgd2UgdHJ5IGl0IGFnYWluIGluIDMgc2Vjb25kc1xuICAgICAgLy9cbiAgICAgIC8vIFRPRE86IHJldmlldyAvIHJldGhpbmsgdGhhdC5cbiAgICAgIC8vXG4gICAgY2FzZSA0MDQ6XG4gICAgICByZXR1cm4gZ2xvYmFsLnNldFRpbWVvdXQocmVtb3RlLnB1bGwsIDMwMDApO1xuXG4gICAgY2FzZSA1MDA6XG4gICAgICAvL1xuICAgICAgLy8gUGxlYXNlIHNlcnZlciwgZG9uJ3QgZ2l2ZSB1cyB0aGVzZS4gQXQgbGVhc3Qgbm90IHBlcnNpc3RlbnRseVxuICAgICAgLy9cbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdlcnJvcjpzZXJ2ZXInLCBlcnJvcik7XG4gICAgICBnbG9iYWwuc2V0VGltZW91dChyZW1vdGUucHVsbCwgMzAwMCk7XG4gICAgICByZXR1cm4gaG9vZGllLmNoZWNrQ29ubmVjdGlvbigpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyB1c3VhbGx5IGEgMCwgd2hpY2ggc3RhbmRzIGZvciB0aW1lb3V0IG9yIHNlcnZlciBub3QgcmVhY2hhYmxlLlxuICAgICAgaWYgKHhoci5zdGF0dXNUZXh0ID09PSAnYWJvcnQnKSB7XG4gICAgICAgIC8vIG1hbnVhbCBhYm9ydCBhZnRlciAyNXNlYy4gcmVzdGFydCBwdWxsaW5nIGNoYW5nZXMgZGlyZWN0bHkgd2hlbiBjb25uZWN0ZWRcbiAgICAgICAgcmV0dXJuIHJlbW90ZS5wdWxsKCk7XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIC8vIG9vcHMuIFRoaXMgbWlnaHQgYmUgY2F1c2VkIGJ5IGFuIHVucmVhY2hhYmxlIHNlcnZlci5cbiAgICAgICAgLy8gT3IgdGhlIHNlcnZlciBjYW5jZWxsZWQgaXQgZm9yIHdoYXQgZXZlciByZWFzb24sIGUuZy5cbiAgICAgICAgLy8gaGVyb2t1IGtpbGxzIHRoZSByZXF1ZXN0IGFmdGVyIH4zMHMuXG4gICAgICAgIC8vIHdlJ2xsIHRyeSBhZ2FpbiBhZnRlciBhIDNzIHRpbWVvdXRcbiAgICAgICAgLy9cbiAgICAgICAgZ2xvYmFsLnNldFRpbWVvdXQocmVtb3RlLnB1bGwsIDMwMDApO1xuICAgICAgICByZXR1cm4gaG9vZGllLmNoZWNrQ29ubmVjdGlvbigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIGhhbmRsZSBpbml0aWFsIGJvb3RzdHJhcHBpbmcgZnJvbSByZW1vdGVcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlQm9vdHN0cmFwU3VjY2VzcygpIHtcbiAgICBpc0Jvb3RzdHJhcHBpbmcgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignYm9vdHN0cmFwOmVuZCcpO1xuICB9XG5cbiAgLy8gIyMjIGhhbmRsZSBlcnJvciBvZiBpbml0aWFsIGJvb3RzdHJhcHBpbmcgZnJvbSByZW1vdGVcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlQm9vdHN0cmFwRXJyb3IoZXJyb3IpIHtcbiAgICBpc0Jvb3RzdHJhcHBpbmcgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignYm9vdHN0cmFwOmVycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgLy8gIyMjIGhhbmRsZSBjaGFuZ2VzIGZyb20gcmVtb3RlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZVB1bGxSZXN1bHRzKGNoYW5nZXMpIHtcbiAgICB2YXIgZG9jLCBldmVudCwgb2JqZWN0LCBfaSwgX2xlbjtcblxuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gY2hhbmdlcy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgZG9jID0gY2hhbmdlc1tfaV0uZG9jO1xuXG4gICAgICBpZiAocmVtb3RlLnByZWZpeCAmJiBkb2MuX2lkLmluZGV4T2YocmVtb3RlLnByZWZpeCkgIT09IDApIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIG9iamVjdCA9IHBhcnNlRnJvbVJlbW90ZShkb2MpO1xuXG4gICAgICBpZiAob2JqZWN0Ll9kZWxldGVkKSB7XG4gICAgICAgIGlmICghcmVtb3RlLmlzS25vd25PYmplY3Qob2JqZWN0KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50ID0gJ3JlbW92ZSc7XG4gICAgICAgIHJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVtb3RlLmlzS25vd25PYmplY3Qob2JqZWN0KSkge1xuICAgICAgICAgIGV2ZW50ID0gJ3VwZGF0ZSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXZlbnQgPSAnYWRkJztcbiAgICAgICAgICByZW1vdGUubWFya0FzS25vd25PYmplY3Qob2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKGV2ZW50ICsgJzonICsgb2JqZWN0LnR5cGUsIG9iamVjdCk7XG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCArICc6JyArIG9iamVjdC50eXBlICsgJzonICsgb2JqZWN0LmlkLCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZScsIGV2ZW50LCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZTonICsgb2JqZWN0LnR5cGUsIGV2ZW50LCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZTonICsgb2JqZWN0LnR5cGUgKyAnOicgKyBvYmplY3QuaWQsIGV2ZW50LCBvYmplY3QpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gYm9vdHN0cmFwIGtub3duIG9iamVjdHNcbiAgLy9cbiAgaWYgKG9wdGlvbnMua25vd25PYmplY3RzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRpb25zLmtub3duT2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVtb3RlLm1hcmtBc0tub3duT2JqZWN0KHtcbiAgICAgICAgdHlwZTogb3B0aW9ucy5rbm93bk9iamVjdHNbaV0udHlwZSxcbiAgICAgICAgaWQ6IG9wdGlvbnMua25vd25PYmplY3RzW2ldLmlkXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGV4cG9zZSBwdWJsaWMgQVBJXG4gIHJldHVybiByZW1vdGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllUmVtb3RlU3RvcmU7XG4iLCIvLyBzY29wZWQgU3RvcmVcbi8vID09PT09PT09PT09PVxuXG4vLyBzYW1lIGFzIHN0b3JlLCBidXQgd2l0aCB0eXBlIHByZXNldCB0byBhbiBpbml0aWFsbHlcbi8vIHBhc3NlZCB2YWx1ZS5cbi8vXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vZXZlbnRzJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTY29wZWRTdG9yZUFwaShob29kaWUsIHN0b3JlQXBpLCBvcHRpb25zKSB7XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG4gIHZhciB0eXBlID0gb3B0aW9ucy50eXBlO1xuICB2YXIgaWQgPSBvcHRpb25zLmlkO1xuXG4gIHZhciBhcGkgPSB7fTtcblxuICAvLyBzY29wZWQgYnkgdHlwZSBvbmx5XG4gIGlmICghaWQpIHtcblxuICAgIC8vIGFkZCBldmVudHNcbiAgICBob29kaWVFdmVudHMoaG9vZGllLCB7XG4gICAgICBjb250ZXh0OiBhcGksXG4gICAgICBuYW1lc3BhY2U6IHN0b3JlTmFtZSArICc6JyArIHR5cGVcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLmFkZCA9IGZ1bmN0aW9uIGFkZChwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kID0gZnVuY3Rpb24gZmluZChpZCkge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmZpbmQodHlwZSwgaWQpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kT3JBZGQgPSBmdW5jdGlvbiBmaW5kT3JBZGQoaWQsIHByb3BlcnRpZXMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5maW5kT3JBZGQodHlwZSwgaWQsIHByb3BlcnRpZXMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kQWxsID0gZnVuY3Rpb24gZmluZEFsbChvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZEFsbCh0eXBlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uIHVwZGF0ZUFsbChvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGVBbGwodHlwZSwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKGlkLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5yZW1vdmVBbGwodHlwZSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIHNjb3BlZCBieSBib3RoOiB0eXBlICYgaWRcbiAgaWYgKGlkKSB7XG5cbiAgICAvLyBhZGQgZXZlbnRzXG4gICAgaG9vZGllRXZlbnRzKGhvb2RpZSwge1xuICAgICAgY29udGV4dDogYXBpLFxuICAgICAgbmFtZXNwYWNlOiBzdG9yZU5hbWUgKyAnOicgKyB0eXBlICsgJzonICsgaWRcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5zYXZlKHR5cGUsIGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZCA9IGZ1bmN0aW9uIGZpbmQoKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZCh0eXBlLCBpZCk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuICB9XG5cbiAgLy9cbiAgYXBpLmRlY29yYXRlUHJvbWlzZXMgPSBzdG9yZUFwaS5kZWNvcmF0ZVByb21pc2VzO1xuICBhcGkudmFsaWRhdGUgPSBzdG9yZUFwaS52YWxpZGF0ZTtcblxuICByZXR1cm4gYXBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVNjb3BlZFN0b3JlQXBpO1xuIiwidmFyIGNoYXJzLCBpLCByYWRpeDtcblxuLy8gdXVpZHMgY29uc2lzdCBvZiBudW1iZXJzIGFuZCBsb3dlcmNhc2UgbGV0dGVycyBvbmx5LlxuLy8gV2Ugc3RpY2sgdG8gbG93ZXJjYXNlIGxldHRlcnMgdG8gcHJldmVudCBjb25mdXNpb25cbi8vIGFuZCB0byBwcmV2ZW50IGlzc3VlcyB3aXRoIENvdWNoREIsIGUuZy4gZGF0YWJhc2Vcbi8vIG5hbWVzIGRvIHdvbmx5IGFsbG93IGZvciBsb3dlcmNhc2UgbGV0dGVycy5cbmNoYXJzID0gJzAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3BsaXQoJycpO1xucmFkaXggPSBjaGFycy5sZW5ndGg7XG5cbi8vIGhlbHBlciB0byBnZW5lcmF0ZSB1bmlxdWUgaWRzLlxuZnVuY3Rpb24gZ2VuZXJhdGVJZCAobGVuZ3RoKSB7XG4gIHZhciBpZCA9ICcnO1xuXG4gIC8vIGRlZmF1bHQgdXVpZCBsZW5ndGggdG8gN1xuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSA3O1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpICogcmFkaXg7XG4gICAgdmFyIGNoYXIgPSBjaGFyc1tNYXRoLmZsb29yKHJhbmQpXTtcbiAgICBpZCArPSBTdHJpbmcoY2hhcikuY2hhckF0KDApO1xuICB9XG5cbiAgcmV0dXJuIGlkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlSWQ7XG4iLCJ2YXIgZmluZExldHRlcnNUb1VwcGVyQ2FzZSA9IC8oXlxcd3xfXFx3KS9nO1xuXG5mdW5jdGlvbiBob29kaWVmeVJlcXVlc3RFcnJvck5hbWUgKG5hbWUpIHtcbiAgbmFtZSA9IG5hbWUucmVwbGFjZShmaW5kTGV0dGVyc1RvVXBwZXJDYXNlLCBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICByZXR1cm4gKG1hdGNoWzFdIHx8IG1hdGNoWzBdKS50b1VwcGVyQ2FzZSgpO1xuICB9KTtcblxuICByZXR1cm4gJ0hvb2RpZScgKyBuYW1lICsgJ0Vycm9yJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVmeVJlcXVlc3RFcnJvck5hbWU7IiwiLy9cbi8vIGhvb2RpZS5yZXF1ZXN0XG4vLyA9PT09PT09PT09PT09PT09XG5cbi8vIEhvb2RpZSdzIGNlbnRyYWwgcGxhY2UgdG8gc2VuZCByZXF1ZXN0IHRvIGl0cyBiYWNrZW5kLlxuLy8gQXQgdGhlIG1vbWVudCwgaXQncyBhIHdyYXBwZXIgYXJvdW5kIGpRdWVyeSdzIGFqYXggbWV0aG9kLFxuLy8gYnV0IHdlIG1pZ2h0IGdldCByaWQgb2YgdGhpcyBkZXBlbmRlbmN5IGluIHRoZSBmdXR1cmUuXG4vL1xuLy8gSXQgaGFzIGJ1aWxkIGluIHN1cHBvcnQgZm9yIENPUlMgYW5kIGEgc3RhbmRhcmQgZXJyb3Jcbi8vIGhhbmRsaW5nIHRoYXQgbm9ybWFsaXplcyBlcnJvcnMgcmV0dXJuZWQgYnkgQ291Y2hEQlxuLy8gdG8gSmF2YVNjcmlwdCdzIG5hdGl2ZSBjb252ZW50aW9ucyBvZiBlcnJvcnMgaGF2aW5nXG4vLyBhIG5hbWUgJiBhIG1lc3NhZ2UgcHJvcGVydHkuXG4vL1xuLy8gQ29tbW9uIGVycm9ycyB0byBleHBlY3Q6XG4vL1xuLy8gKiBIb29kaWVSZXF1ZXN0RXJyb3Jcbi8vICogSG9vZGllVW5hdXRob3JpemVkRXJyb3Jcbi8vICogSG9vZGllQ29uZmxpY3RFcnJvclxuLy8gKiBIb29kaWVTZXJ2ZXJFcnJvclxuXG52YXIgaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lID0gcmVxdWlyZSgnLi9ob29kaWVmeV9yZXF1ZXN0X2Vycm9yX25hbWUnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKTtcblxuZnVuY3Rpb24gaG9vZGllUmVxdWVzdChob29kaWUpIHtcbiAgdmFyICRhamF4ID0gJC5hamF4O1xuXG4gIC8vIEhvb2RpZSBiYWNrZW5kIGxpc3RlbnRzIHRvIHJlcXVlc3RzIHByZWZpeGVkIGJ5IC9fYXBpLFxuICAvLyBzbyB3ZSBwcmVmaXggYWxsIHJlcXVlc3RzIHdpdGggcmVsYXRpdmUgVVJMc1xuICB2YXIgQVBJX1BBVEggPSAnL19hcGknO1xuXG4gIC8vIFJlcXVlc3RzXG4gIC8vIC0tLS0tLS0tLS1cblxuICAvLyBzZW5kcyByZXF1ZXN0cyB0byB0aGUgaG9vZGllIGJhY2tlbmQuXG4gIC8vXG4gIC8vICAgICBwcm9taXNlID0gaG9vZGllLnJlcXVlc3QoJ0dFVCcsICcvdXNlcl9kYXRhYmFzZS9kb2NfaWQnKVxuICAvL1xuICBmdW5jdGlvbiByZXF1ZXN0KHR5cGUsIHVybCwgb3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cywgcmVxdWVzdFByb21pc2UsIHBpcGVkUHJvbWlzZTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgZGVmYXVsdHMgPSB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgIH07XG5cbiAgICAvLyBpZiBhYnNvbHV0ZSBwYXRoIHBhc3NlZCwgc2V0IENPUlMgaGVhZGVyc1xuXG4gICAgLy8gaWYgcmVsYXRpdmUgcGF0aCBwYXNzZWQsIHByZWZpeCB3aXRoIGJhc2VVcmxcbiAgICBpZiAoIS9eaHR0cC8udGVzdCh1cmwpKSB7XG4gICAgICB1cmwgPSAoaG9vZGllLmJhc2VVcmwgfHwgJycpICsgQVBJX1BBVEggKyB1cmw7XG4gICAgfVxuXG4gICAgLy8gaWYgdXJsIGlzIGNyb3NzIGRvbWFpbiwgc2V0IENPUlMgaGVhZGVyc1xuICAgIGlmICgvXmh0dHAvLnRlc3QodXJsKSkge1xuICAgICAgZGVmYXVsdHMueGhyRmllbGRzID0ge1xuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIH07XG4gICAgICBkZWZhdWx0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMudXJsID0gdXJsO1xuXG5cbiAgICAvLyB3ZSBhcmUgcGlwaW5nIHRoZSByZXN1bHQgb2YgdGhlIHJlcXVlc3QgdG8gcmV0dXJuIGEgbmljZXJcbiAgICAvLyBlcnJvciBpZiB0aGUgcmVxdWVzdCBjYW5ub3QgcmVhY2ggdGhlIHNlcnZlciBhdCBhbGwuXG4gICAgLy8gV2UgY2FuJ3QgcmV0dXJuIHRoZSBwcm9taXNlIG9mIGFqYXggZGlyZWN0bHkgYmVjYXVzZSBvZlxuICAgIC8vIHRoZSBwaXBpbmcsIGFzIGZvciB3aGF0ZXZlciByZWFzb24gdGhlIHJldHVybmVkIHByb21pc2VcbiAgICAvLyBkb2VzIG5vdCBoYXZlIHRoZSBgYWJvcnRgIG1ldGhvZCBhbnkgbW9yZSwgbWF5YmUgb3RoZXJzXG4gICAgLy8gYXMgd2VsbC4gU2VlIGFsc28gaHR0cDovL2J1Z3MuanF1ZXJ5LmNvbS90aWNrZXQvMTQxMDRcbiAgICByZXF1ZXN0UHJvbWlzZSA9ICRhamF4KGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykpO1xuICAgIHBpcGVkUHJvbWlzZSA9IHJlcXVlc3RQcm9taXNlLnRoZW4oIG51bGwsIGhhbmRsZVJlcXVlc3RFcnJvcik7XG4gICAgcGlwZWRQcm9taXNlLmFib3J0ID0gcmVxdWVzdFByb21pc2UuYWJvcnQ7XG5cbiAgICByZXR1cm4gcGlwZWRQcm9taXNlO1xuICB9XG5cbiAgLy9cbiAgLy9cbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUmVxdWVzdEVycm9yKHhocikge1xuICAgIHZhciBlcnJvcjtcblxuICAgIHRyeSB7XG4gICAgICBlcnJvciA9IHBhcnNlRXJyb3JGcm9tUmVzcG9uc2UoeGhyKTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcblxuICAgICAgaWYgKHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgZXJyb3IgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IgPSB7XG4gICAgICAgICAgbmFtZTogJ0hvb2RpZUNvbm5lY3Rpb25FcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ0NvdWxkIG5vdCBjb25uZWN0IHRvIEhvb2RpZSBzZXJ2ZXIgYXQge3t1cmx9fS4nLFxuICAgICAgICAgIHVybDogaG9vZGllLmJhc2VVcmwgfHwgJy8nXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2RpZS5yZWplY3RXaXRoKGVycm9yKS5wcm9taXNlKCk7XG4gIH1cblxuICAvL1xuICAvLyBDb3VjaERCIHJldHVybnMgZXJyb3JzIGluIEpTT04gZm9ybWF0LCB3aXRoIHRoZSBwcm9wZXJ0aWVzXG4gIC8vIGBlcnJvcmAgYW5kIGByZWFzb25gLiBIb29kaWUgdXNlcyBKYXZhU2NyaXB0J3MgbmF0aXZlIEVycm9yXG4gIC8vIHByb3BlcnRpZXMgYG5hbWVgIGFuZCBgbWVzc2FnZWAgaW5zdGVhZCwgc28gd2UgYXJlIG5vcm1hbGl6aW5nXG4gIC8vIHRoYXQuXG4gIC8vXG4gIC8vIEJlc2lkZXMgdGhlIHJlbmFtaW5nIHdlIGFsc28gZG8gYSBtYXRjaGluZyB3aXRoIGEgbWFwIG9mIGtub3duXG4gIC8vIGVycm9ycyB0byBtYWtlIHRoZW0gbW9yZSBjbGVhci4gRm9yIHJlZmVyZW5jZSwgc2VlXG4gIC8vIGh0dHBzOi8vd2lraS5hcGFjaGUub3JnL2NvdWNoZGIvRGVmYXVsdF9odHRwX2Vycm9ycyAmXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hcGFjaGUvY291Y2hkYi9ibG9iL21hc3Rlci9zcmMvY291Y2hkYi9jb3VjaF9odHRwZC5lcmwjTDgwN1xuICAvL1xuXG4gIGZ1bmN0aW9uIHBhcnNlRXJyb3JGcm9tUmVzcG9uc2UoeGhyKSB7XG4gICAgdmFyIGVycm9yID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcblxuICAgIC8vIGdldCBlcnJvciBuYW1lXG4gICAgZXJyb3IubmFtZSA9IEhUVFBfU1RBVFVTX0VSUk9SX01BUFt4aHIuc3RhdHVzXTtcbiAgICBpZiAoISBlcnJvci5uYW1lKSB7XG4gICAgICBlcnJvci5uYW1lID0gaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lKGVycm9yLmVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZSBzdGF0dXMgJiBtZXNzYWdlXG4gICAgZXJyb3Iuc3RhdHVzID0geGhyLnN0YXR1cztcbiAgICBlcnJvci5tZXNzYWdlID0gZXJyb3IucmVhc29uIHx8ICcnO1xuICAgIGVycm9yLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZXJyb3IubWVzc2FnZS5zbGljZSgxKTtcblxuICAgIC8vIGNsZWFudXBcbiAgICBkZWxldGUgZXJyb3IuZXJyb3I7XG4gICAgZGVsZXRlIGVycm9yLnJlYXNvbjtcblxuICAgIHJldHVybiBlcnJvcjtcbiAgfVxuXG4gIC8vIG1hcCBDb3VjaERCIEhUVFAgc3RhdHVzIGNvZGVzIHRvIEhvb2RpZSBFcnJvcnNcbiAgdmFyIEhUVFBfU1RBVFVTX0VSUk9SX01BUCA9IHtcbiAgICA0MDA6ICdIb29kaWVSZXF1ZXN0RXJyb3InLCAvLyBiYWQgcmVxdWVzdFxuICAgIDQwMTogJ0hvb2RpZVVuYXV0aG9yaXplZEVycm9yJyxcbiAgICA0MDM6ICdIb29kaWVSZXF1ZXN0RXJyb3InLCAvLyBmb3JiaWRkZW5cbiAgICA0MDQ6ICdIb29kaWVOb3RGb3VuZEVycm9yJywgLy8gZm9yYmlkZGVuXG4gICAgNDA5OiAnSG9vZGllQ29uZmxpY3RFcnJvcicsXG4gICAgNDEyOiAnSG9vZGllQ29uZmxpY3RFcnJvcicsIC8vIGZpbGUgZXhpc3RcbiAgICA1MDA6ICdIb29kaWVTZXJ2ZXJFcnJvcidcbiAgfTtcblxuICAvL1xuICAvLyBwdWJsaWMgQVBJXG4gIC8vXG4gIGhvb2RpZS5yZXF1ZXN0ID0gcmVxdWVzdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVSZXF1ZXN0O1xuIiwiLy8gSG9vZGllIEFkbWluXG4vLyAtLS0tLS0tLS0tLS0tXG4vL1xuLy8geW91ciBmcmllbmRseSBsaWJyYXJ5IGZvciBwb2NrZXQsXG4vLyB0aGUgSG9vZGllIEFkbWluIFVJXG4vL1xudmFyIGhvb2RpZVJlcXVlc3QgPSByZXF1aXJlKCdob29kaWUvc3JjL3V0aWxzL3JlcXVlc3QnKTtcbnZhciBob29kaWVPcGVuID0gcmVxdWlyZSgnaG9vZGllL3NyYy9ob29kaWUvb3BlbicpO1xuXG52YXIgaG9vZGllQWRtaW5BY2NvdW50ID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vYWNjb3VudCcpO1xudmFyIGhvb2RpZUFkbWluUGx1Z2luID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vcGx1Z2luJyk7XG52YXIgaG9vZGllQWRtaW5Vc2VyID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vdXNlcicpO1xuXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnaG9vZGllL3NyYy9saWIvZXZlbnRzJyk7XG5cbi8vIENvbnN0cnVjdG9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIFdoZW4gaW5pdGlhbGl6aW5nIGEgaG9vZGllIGluc3RhbmNlLCBhbiBvcHRpb25hbCBVUkxcbi8vIGNhbiBiZSBwYXNzZWQuIFRoYXQncyB0aGUgVVJMIG9mIHRoZSBob29kaWUgYmFja2VuZC5cbi8vIElmIG5vIFVSTCBwYXNzZWQgaXQgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgZG9tYWluLlxuLy9cbi8vICAgICAvLyBpbml0IGEgbmV3IGhvb2RpZSBpbnN0YW5jZVxuLy8gICAgIGhvb2RpZSA9IG5ldyBIb29kaWVcbi8vXG5mdW5jdGlvbiBIb29kaWVBZG1pbihiYXNlVXJsKSB7XG4gIHZhciBob29kaWVBZG1pbiA9IHRoaXM7XG5cbiAgLy8gZW5mb3JjZSBpbml0aWFsaXphdGlvbiB3aXRoIGBuZXdgXG4gIGlmICghKGhvb2RpZUFkbWluIGluc3RhbmNlb2YgSG9vZGllQWRtaW4pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2FnZTogbmV3IEhvb2RpZUFkbWluKHVybCk7Jyk7XG4gIH1cblxuICAvLyByZW1vdmUgdHJhaWxpbmcgc2xhc2hlc1xuICBob29kaWVBZG1pbi5iYXNlVXJsID0gYmFzZVVybCA/IGJhc2VVcmwucmVwbGFjZSgvXFwvKyQvLCAnJykgOiAnJztcblxuXG4gIC8vIGhvb2RpZUFkbWluLmV4dGVuZFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgaG9vZGllQWRtaW4gaW5zdGFuY2U6XG4gIC8vXG4gIC8vICAgICBob29kaWVBZG1pbi5leHRlbmQoZnVuY3Rpb24oaG9vZGllQWRtaW4pIHt9IClcbiAgLy9cbiAgaG9vZGllQWRtaW4uZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKGV4dGVuc2lvbikge1xuICAgIGV4dGVuc2lvbihob29kaWVBZG1pbik7XG4gIH07XG5cbiAgLy9cbiAgLy8gRXh0ZW5kaW5nIGhvb2RpZSBhZG1pbiBjb3JlXG4gIC8vXG5cbiAgLy8gKiBob29kaWVBZG1pbi5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub25cbiAgLy8gKiBob29kaWVBZG1pbi5vbmVcbiAgLy8gKiBob29kaWVBZG1pbi50cmlnZ2VyXG4gIC8vICogaG9vZGllQWRtaW4udW5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub2ZmXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVFdmVudHMpO1xuXG4gIC8vICogaG9vZGllQWRtaW4ucmVxdWVzdFxuICBob29kaWVBZG1pbi5leHRlbmQoaG9vZGllUmVxdWVzdCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5vcGVuXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVPcGVuKTtcblxuICAvLyAqIGhvb2RpZUFkbWluLmFjY291bnRcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluQWNjb3VudCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5wbHVnaW5cbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluUGx1Z2luKTtcblxuICAvLyAqIGhvb2RpZUFkbWluLnVzZXJcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluVXNlcik7XG5cbiAgLy9cbiAgLy8gbG9hZGluZyB1c2VyIGV4dGVuc2lvbnNcbiAgLy9cbiAgYXBwbHlFeHRlbnNpb25zKEhvb2RpZUFkbWluKTtcbn1cblxuLy8gRXh0ZW5kaW5nIEhvb2RpZUFkbWluXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFlvdSBjYW4gZXh0ZW5kIHRoZSBIb29kaWUgY2xhc3MgbGlrZSBzbzpcbi8vXG4vLyBIb29kaWUuZXh0ZW5kKGZ1bmNpb24oSG9vZGllQWRtaW4pIHsgSG9vZGllQWRtaW4ubXlNYWdpYyA9IGZ1bmN0aW9uKCkge30gfSlcbi8vXG5cbnZhciBleHRlbnNpb25zID0gW107XG5cbkhvb2RpZUFkbWluLmV4dGVuZCA9IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICBleHRlbnNpb25zLnB1c2goZXh0ZW5zaW9uKTtcbn07XG5cbi8vXG4vLyBkZXRlY3QgYXZhaWxhYmxlIGV4dGVuc2lvbnMgYW5kIGF0dGFjaCB0byBIb29kaWUgT2JqZWN0LlxuLy9cbmZ1bmN0aW9uIGFwcGx5RXh0ZW5zaW9ucyhob29kaWUpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHRlbnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgZXh0ZW5zaW9uc1tpXShob29kaWUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllQWRtaW47XG4iLCIvLyBIb29kaWVBZG1pbiBBY2NvdW50XG4vLyA9PT09PT09PT09PT09PT09PT09XG5cbnZhciBob29kaWVFdmVudHMgPSByZXF1aXJlKCdob29kaWUvc3JjL2xpYi9ldmVudHMnKTtcblxudmFyIEFETUlOX1VTRVJOQU1FID0gJ2FkbWluJztcblxuZnVuY3Rpb24gaG9vZGllQWNjb3VudCAoaG9vZGllQWRtaW4pIHtcblxuICAvLyBwdWJsaWMgQVBJXG4gIHZhciBhY2NvdW50ID0ge307XG4gIHZhciBzaWduZWRJbiA9IG51bGw7XG5cbiAgLy8gYWRkIGV2ZW50cyBBUElcbiAgaG9vZGllRXZlbnRzKGhvb2RpZUFkbWluLCB7XG4gICAgY29udGV4dDogYWNjb3VudCxcbiAgICBuYW1lc3BhY2U6ICdhY2NvdW50J1xuICB9KTtcblxuXG4gIC8vIHNpZ24gaW4gd2l0aCBwYXNzd29yZFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gdXNlcm5hbWUgaXMgaGFyZGNvZGVkIHRvIFwiYWRtaW5cIlxuICBhY2NvdW50LnNpZ25JbiA9IGZ1bmN0aW9uIHNpZ25JbihwYXNzd29yZCkge1xuICAgIHZhciByZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgbmFtZTogQURNSU5fVVNFUk5BTUUsXG4gICAgICAgIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gaG9vZGllQWRtaW4ucmVxdWVzdCgnUE9TVCcsICcvX3Nlc3Npb24nLCByZXF1ZXN0T3B0aW9ucylcbiAgICAuZG9uZSggZnVuY3Rpb24oKSB7XG4gICAgICBzaWduZWRJbiA9IHRydWU7XG4gICAgICBhY2NvdW50LnRyaWdnZXIoJ3NpZ25pbicsIEFETUlOX1VTRVJOQU1FKTtcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHNpZ24gb3V0XG4gIC8vIC0tLS0tLS0tLVxuICBhY2NvdW50LnNpZ25PdXQgPSBmdW5jdGlvbiBzaWduT3V0KCkge1xuICAgIHJldHVybiBob29kaWVBZG1pbi5yZXF1ZXN0KCdERUxFVEUnLCAnL19zZXNzaW9uJylcbiAgICAuZG9uZSggZnVuY3Rpb24oKSB7XG4gICAgICBzaWduZWRJbiA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGhvb2RpZUFkbWluLnRyaWdnZXIoJ3NpZ25vdXQnKTtcbiAgICB9KTtcbiAgfTtcblxuICBhY2NvdW50Lmhhc1ZhbGlkU2Vzc2lvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhIXNpZ25lZEluO1xuICB9O1xuXG4gIGFjY291bnQuaGFzSW5WYWxpZFNlc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gISFzaWduZWRJbjtcbiAgfTtcblxuICBob29kaWVBZG1pbi5hY2NvdW50ID0gYWNjb3VudDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVBY2NvdW50O1xuXG4iLCJmdW5jdGlvbiBob29kaWVBZG1pblBsdWdpbihob29kaWVBZG1pbikge1xuICBob29kaWVBZG1pbi5wbHVnaW5zID0gaG9vZGllQWRtaW4ub3BlbigncGx1Z2lucycpO1xuICBob29kaWVBZG1pbi5wbHVnaW5zLmNvbm5lY3QoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVBZG1pblBsdWdpbjtcblxuIiwiZnVuY3Rpb24gaG9vZGllQWRtaW5Vc2VyKGhvb2RpZUFkbWluKSB7XG4gIGhvb2RpZUFkbWluLnVzZXIgPSBob29kaWVBZG1pbi5vcGVuKCdfdXNlcnMnLCB7XG4gICAgcHJlZml4OiAnb3JnLmNvdWNoZGIudXNlcjonXG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZUFkbWluVXNlcjtcblxuIl19
(13)
});
;