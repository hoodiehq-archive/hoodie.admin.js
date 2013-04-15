describe "Hoodie.Admin", ->
  beforeEach ->
    @hoodie = new Hoodie 'http://couch.example.com'
    spyOn($, "ajax").andReturn $.Deferred()

  describe "constructor", ->
    it "should have some specs", ->
      expect('Hoodie.Admin').toBe 'tested'
  # /constructor

# /HoodieAdmin