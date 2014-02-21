function hoodieAdminPlugin( hoodieAdmin ) {
  hoodieAdmin.plugin = hoodieAdmin.open('plugins');
}

module.exports = hoodieAdminPlugin;
