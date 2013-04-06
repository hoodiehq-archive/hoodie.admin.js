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

  # 
  # sign ups new user, and signs out directly after
  addTestUser: (options = {}) ->
    baseUrl = hoodie.baseUrl
    hash = "test#{hoodie.uuid(5)}"

    # HACK!
    # we need to clear localStorage, otherwise signing up a new user
    # will fail, as account username & ownerHash from last sign up
    # might still be present
    @hoodie.store.clear()
    testHoodieUser = new Hoodie baseUrl.replace(/\bapi\./, "#{hash}.api.")
    testHoodieUser.account.ownerHash = hash
    email = "#{testHoodieUser.account.ownerHash}@example.com"

    testHoodieUser.account.signUp( email )
    .then ->
      testHoodieUser.account.signOut() unless options.keepSignedIn
    .then ->
      return testHoodieUser

  # 
  # signs up multiple users
  addTestUsers: ( nr = 1 ) ->
    timestamp = (new Date).getTime()
    promises = for i in [1..nr]
      @addTestUser()

    $.when promises...

  # 
  # gets a test user. If non exists yet, one gets created
  getTestUser : ->
    @findAll('user').then (users) =>
      if users.length
        # get random user
        user = users[Math.floor(Math.random()*users.length)];
        username = user.name.split(/\//).pop()
        userHoodie = new Hoodie hoodie.baseUrl.replace(/\bapi\./, "#{user.ownerHash}-#{hoodie.uuid(5)}.api.")
        userHoodie.account.signIn( username ).then -> return userHoodie
      else
        @addTestUser keepSignedIn : true



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

