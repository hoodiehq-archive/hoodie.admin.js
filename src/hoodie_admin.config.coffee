# HoodieAdmin.Config
# ================

#
class HoodieAdmin.Config

  # 
  constructor: (@hoodie) ->

  get: ->
    @hoodie.modules.find("appconfig").pipe (module) -> module.config

  set: (config = {}) ->
    @hoodie.modules.update("appconfig", {config: config})