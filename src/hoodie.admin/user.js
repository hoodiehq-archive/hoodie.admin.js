function hoodieAdminUser( hoodieAdmin ) {
  hoodieAdmin.user = hoodieAdmin.open('_users', {
    prefix: 'org.couchdb.user:'
  });
}

module.exports = hoodieAdminUser;
