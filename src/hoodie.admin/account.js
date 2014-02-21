// HoodieAdmin Account
// ===================

var hoodieEvents = require('hoodie/src/lib/events');

var ADMIN_USERNAME = 'admin';

function hoodieAccount (hoodieAdmin) {

  // public API
  var account = {};

  // add events API
  hoodieEvents(hoodieAdmin, { context: account, namespace: 'account'});

  
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
      account.trigger('signin', ADMIN_USERNAME);
    });
  };


  // sign out
  // ---------

  //
  account.signOut = function signOut() {
    return hoodieAdmin.request('DELETE', '/_session')
    .done( function() {
      return hoodieAdmin.trigger('signout');
    });
  };

  hoodieAdmin.account = account;
}

module.exports = hoodieAccount;
