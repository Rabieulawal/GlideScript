// GlideScript Demo — Hello World
// This showcases pages, navigation, boxes, buttons, and variables

pg.home [
  text = "Welcome to GlideScript"
  space.3

  Add.Box(colour = #e8f4f8, Size = 60 and 25, location = 20 and 18, edges = rounded, text = "This is a fluid box that scales with your screen")

  space.30

  text = "Type your name below:"
  add.textbox(placeholder = "Enter your name", var = username)

  space.2

  add.botton(text = "About this app", click = open Pg.about, colour = #2d6a4f, edges = rounded)
  add.botton(text = "Go to Dashboard", click = open Pg.dashboard, colour = #1a1a2e, edges = rounded)
]

pg.about [
  text = "About GlideScript"
  space.2
  text = "GlideScript is a declarative language for building web apps."
  text = "Write simple, readable code — the compiler handles the rest."
  space.3

  Add.Box(colour = #fff3cd, Size = 50 and 15, location = 25 and 40, edges = rounded, text = "No HTML or CSS knowledge required!")

  space.25
  add.botton(text = "Back to Home", click = open Pg.home, colour = #6c757d, edges = rounded)
]

pg.dashboard [
  text = "Dashboard"
  space.2
  text = "This is a simple dashboard page."
  space.2

  Add.Box(colour = #d4edda, Size = 25 and 20, location = 5 and 25, edges = rounded, text = "Stats")
  Add.Box(colour = #cce5ff, Size = 25 and 20, location = 35 and 25, edges = rounded, text = "Reports")
  Add.Box(colour = #f8d7da, Size = 25 and 20, location = 65 and 25, edges = rounded, text = "Settings")
]

pg.admin [
  pg.hide = true
  text = "Admin Panel — Hidden from navigation"
  space.2
  text = "This page is not shown in the navigation bar."
]
