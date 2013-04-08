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
    
    hash  = "test#{hoodie.uuid(5)}"
    email = "#{hash}@example.com" 
    @_signUpUser(hash, email)



  # 
  # signs up multiple users
  addTestUsers: ( nr = 1 ) ->
    timestamp = (new Date).getTime()
    if nr > 10
      @addTestUsers(10).then =>
        nr -= 10
        @addTestUsers(nr)
    else
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


  # sign up user by PUTing a doc in _users
  _signUpUser : (ownerHash, username, password = '') -> 
    unless username
      return @hoodie.defer().reject(error: 'username must be set').promise()

    key = "user/#{username}"
    db  = "user/#{ownerHash}"
    now = new Date
    id  = "org.couchdb.user:#{key}"
    url = "/#{encodeURIComponent id}"

    options =
      data         :
        _id        : id
        name       : key
        type       : 'user'
        roles      : []
        password   : password
        ownerHash  : ownerHash
        database   : db
        updatedAt  : now
        createdAt  : now
        signedUpAt : now

    @request('PUT', url, options)