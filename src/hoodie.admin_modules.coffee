# Hoodie.AdminModules
# =====================

#
class Hoodie.AdminModules extends Hoodie.Remote

  name   : 'modules'

  constructor: (@hoodie, @admin) ->
    #
    super


  find: (type, moduleName) =>
    # support both (id) and ('module', id)
    moduleName = type unless moduleName

    if moduleName is 'module'
      debugger

    super "module", moduleName


  findAll: =>
    super 'module'

  update : (moduleName, config) ->
    debugger
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
