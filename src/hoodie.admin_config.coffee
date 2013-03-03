# Hoodie.AdminConfig
# ================

#
class Hoodie.AdminConfig

  # 
  constructor: (@hoodie, @admin) ->

  get: ->
    @modules.find("appconfig").pipe (module) -> module.config

  set: (config = {}) ->
    promise = @modules.update("module", "appconfig", {config: config})
    return promise