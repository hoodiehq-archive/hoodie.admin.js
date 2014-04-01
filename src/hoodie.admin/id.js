function hoodieAdminId(hoodieAdmin) {
  hoodieAdmin.id = function id() {
    return 'admin';
  };
}

module.exports = hoodieAdminId;

