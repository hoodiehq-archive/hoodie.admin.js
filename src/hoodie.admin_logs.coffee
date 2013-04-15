# Hoodie.AdminLogs
# ================

#
class Hoodie.AdminLogs

  constructor: (@admin) ->
    @hoodie = @admin.hoodie
    #

  findAll : ->
    @hoodie.resolveWith []
