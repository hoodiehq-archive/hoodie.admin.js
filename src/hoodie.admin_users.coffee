# Hoodie.AdminUsers
# ================

# inherits from [Hoodie.Remote](http://hoodiehq.github.com/hoodie.js/doc/hoodie/remote.html)
# and adds these extra methods:
#
# * total
# * search
#
class Hoodie.AdminUsers extends Hoodie.Remote

  name   : '_users'
  prefix : 'org.couchdb.user:'

  constructor: (hoodie, admin) ->
    @hoodie = hoodie
    @admin  = admin
    super

  addTestUser: (email) ->
    baseUrl = hoodie.baseUrl
    hash = "test-#{hoodie.uuid(5)}"

    # HACK!
    # we need to clear localStorage, otherwise signing up a new user
    # will fail, as account username & ownerHash from last sign up
    # might still be present
    @hoodie.store.clear()
    testHoodieUser = new Hoodie baseUrl.replace(/\bapi\./, "#{hash}.api.")
    testHoodieUser.account.ownerHash = hash

    unless email
      email = "#{testHoodieUser.account.ownerHash}@example.com"

    testHoodieUser.account.signUp( email, 'secret' )

  addTestUsers: ( nr = 1 ) ->
    timestamp = (new Date).getTime()
    promises = for i in [1..nr]
      @addTestUser()

    $.when promises...

  removeAllTestUsers: ->
    @hoodie.rejectWith(error: "not yet implemented")


  getTotal : ->
    @findAll().pipe (users) -> users.length

  search : (query) ->
    path = "/_all_docs?include_docs=true"
    path = "#{path}&startkey=\"org.couchdb.user:user/#{query}\"&endkey=\"org.couchdb.user:user/#{query}|\""

    @request("GET", path)
    .pipe(@_mapDocsFromFindAll).pipe(@parseAllFromRemote)


  #
  request : (type, path, options = {}) ->
    path = "/#{encodeURIComponent @name}#{path}" if @name

    options.contentType or= 'application/json'
    if type is 'POST' or type is 'PUT'
      options.dataType    or= 'json'
      options.processData or= false
      options.data = JSON.stringify options.data

    @admin.request type, path, options


  # filter out non-user docs
  _mapDocsFromFindAll : (response) =>
    rows = response.rows.filter (row) -> /^org\.couchdb\.user:/.test row.id
    rows.map (row) -> row.doc

  # _parseFromRemote : (object)
