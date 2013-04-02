# Hoodie.AdminConfig
# ================

#
class Hoodie.AdminConfig

  # 
  constructor: (@hoodie, @admin) ->

  get: ->
    @admin.modules.find("appconfig").pipe (module) -> module.config

  set: (config = {}) ->
    @admin.modules.update("appconfig", {config: config})