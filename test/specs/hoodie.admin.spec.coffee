describe "HoodieAdmin", ->
  beforeEach ->
    @hoodie = new Hoodie 'http://couch.example.com'
    spyOn($, "ajax").andReturn $.Deferred()

  describe "constructor", ->
    it "should have some specs", ->
      expect('funky').toBe 'fresh'
  # /constructor

# /HoodieAdmin