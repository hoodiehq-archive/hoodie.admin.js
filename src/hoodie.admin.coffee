# Hoodie.Admin
# ==============

# Extends hoodie with an admin module with
# commont tasks needed for the pocket admin UI.
#

#
class Hoodie.Admin

  constructor: (@hoodie) ->

    # init admin submodules
    @account = new Hoodie.AdminAccount @hoodie, this
    @users   = new Hoodie.AdminUsers   @hoodie, this
    @config  = new Hoodie.AdminConfig  @hoodie, this
    @logs    = new Hoodie.AdminLogs    @hoodie, this
    @modules = new Hoodie.AdminModules @hoodie, this


  # trigger
  # ---------

  # proxies to `hoodie.trigger` with `admin` prefix
  trigger : (event, parameters...) ->
    @hoodie.trigger "admin:#{event}", parameters...


  # on
  # ---------

  # proxies to `hoodie.on` with `admin` prefix
  on : (event, data) ->
    event = event.replace /(^| )([^ ]+)/g, "$1admin:$2"
    @hoodie.on event, data


  # request
  # --------------

  # just like the standard hoodie.request method,
  # but with an `admin.` subdomain on hoodie.baseUrl,
  # so that interaction with hoodie.admin does not 
  # interfere with other hoodie.requests.
  request : (type, path, options = {}) ->
    baseUrl = @hoodie.baseUrl.replace /\bapi\./, 'admin.api.'

    defaults =
      type        : type
      url         : "#{baseUrl}#{path}"
      xhrFields   : withCredentials: true
      crossDomain : true
      dataType    : 'json'

    $.ajax $.extend defaults, options


  # authenticate
  # --------------

  #
  authenticate : ->
    @account.authenticate()


  # sign in
  # --------------

  #
  signIn : (password) ->
    @account.signIn(password)


  # sign out
  # --------------

  #
  signOut : () ->
    @account.signOut()

Hoodie.extend 'admin', Hoodie.Admin