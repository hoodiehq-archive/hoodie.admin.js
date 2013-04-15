# Hoodie.AdminModules
# =====================

#
class Hoodie.AdminModules extends Hoodie.Remote

  name   : 'modules'

  constructor: (@admin) ->
    @hoodie = @admin.hoodie
    super(@hoodie)


  find: (type, moduleName) =>
    # support both (id) and ('module', id)
    moduleName = type unless moduleName

    super "module", moduleName


  findAll: =>
    super 'module'

  update : (moduleName, config) ->
    super "module", moduleName, config

  getConfig : (moduleName) ->
    @hoodie.resolveWith
      email:
          transport:
              host: "",
              port: 465,
              auth:
                  user: "@gmail.com",
                  pass: ""
              secureConnection: true,
              service: "Gmail"

  setConfig : (moduleName, config = {}) ->
    @hoodie.resolveWith(config)

    
  #
  request : (type, path, options = {}) ->
    path = "/#{encodeURIComponent @name}#{path}" if @name

    options.contentType or= 'application/json'
    if type is 'POST' or type is 'PUT'
      options.dataType    or= 'json'
      options.processData or= false
      options.data = JSON.stringify options.data

    @admin.request type, path, options
