# Hoodie.AdminAccount
# ================

#
class Hoodie.AdminAccount extends Hoodie.Account

  # 
  constructor : (@admin) ->
    @hoodie = @admin.hoodie
    
    @username = 'admin'
    @_requests = {}

    # hide useless methods
    @[method] = undefined for method in [
      'signUp'
      'destroy'
      'anonymousSignUp'
      'hasAnonymousAccount'
      'setAnonymousPassword'
      'getAnonymousPassword'
      'removeAnonymousPassword'
    ]
  
  # On
  # ---

  # shortcut for `hoodie.admin.on`
  on : (event, cb) -> 
    event = event.replace /(^| )([^ ]+)/g, "$1account:$2"
    @admin.on event, cb


  # Trigger
  # ---

  # shortcut for `hoodie.admin.trigger`
  trigger : (event, parameters...) -> 
    @admin.trigger "account:#{event}", parameters...


  # Request
  # ---

  # shortcut for `hoodie.admin.request`
  request : (type, path, options = {}) ->
    @admin.request arguments...


  # 
  signIn : (password) ->
    username = 'admin'
    @_sendSignInRequest username, password


  # 
  signOut : (password) ->
    @_sendSignOutRequest().then => @trigger 'signout'

  #
  _handleAuthenticateRequestSuccess : (response) =>
    if response.userCtx.name is 'admin'
      @_authenticated = true
      @trigger 'authenticated', @username
      @hoodie.resolveWith @admin
    else
      @_authenticated = false
      @trigger 'error:unauthenticated'
      @hoodie.rejectWith()

  #
  _handleSignInSuccess : (options = {}) =>
    return (response) =>
      @trigger 'signin', @username
      @trigger 'authenticated', @username
      @hoodie.resolveWith @admin

  #
  _userKey : ->
    'admin'

