# p4g-fusion

**A web-based fusion helper app for Persona 4 Golden (calculates fusion results and generates recipes)**

## History Lesson

I was playing Persona 4 Golden and decided that it would be reeeally helpful if I had an easy way to:
1) Calculate the fusion results of personae I hadn't registered in the compendium yet
2) Calculate fusion "recipes" that would produce a specific persona

I thought it would be absolutely, definitely useful. So much so that I decided to stop playing P4G and decided to write some kind of program, using some kind of technology... and it was with this iron resolve that I wrote a crappy Java program to harvest persona information from one of the FAQs on GameFAQs (that's not here, alas ;)), and made a note to write the actual fusion app itself. And then got distracted by other stuff and forgot about it.

So now, two year later, I decided it would also definitely be useful to learn some web programming. :) Specifically, JavaScript, HTML and CSS. This is a big, complicated and confusing world of technologies, frameworks and buzzwords. So I wanted to start with something simple(-ish), and remembered that fusion helper I'd been meaning to write. And the fact that I *still* hadn't finished P4G. :( This time my resolve was somewhat more substantive, and produced an actual useful output.

## Some Helpful Info

If you're reading this, I guess that somehow you stumbled across this *Baby's First JavaScript Program*, probably because you like persona or something. If so: Hey, that's great! :) It's pretty straightforward to use, since there are only two things you can do with it, but I'll make a few notes below in bullet form to help out, just in case:

- You can switch between the "Fusion" and "Recipes" screens by clicking the banner at the top.
- Whether you've chosen a persona using a dropdown, or looking at a generated result, you can click the *banner* with the persona's details on it to expand it and show the persona's resistances and skills. You can also click the skill names to get a simple description about it (and some stats).
- The Recipes screen has some tooltips for the filter edit box (the big white box) and both the buttons next to it, which should help to explain how it actually works. Filtering is **definitely** important since for most personae have thousands of recipes, and you'll probably be more interested in some than others!

Feel free to just mess around and figure things out. :)

It could certainly benefit from a bit more polish, and I do have some ideas for further functionality -- in particular, suggesting fusion sequences for inheriting specific skills -- but that sounds like hard work and my resolve needs a rest. I definitely want to iron out any bugs in the recipe generation code, though; it was hard getting information about how exactly this is supposed to work, and while loads of the recipes I've tried are correct, there might be a few fakes hiding in there.

If you want to get in touch, even though you *probably don't exist* (don't be discouraged), send a mail to persona@nabudis.com.

Cheers,
M


P.S. I've included a ready-made version in the "dist" folder, in case you can't be bothered to build it. You'll still need to run it through some kind of web server for it to work properly, I think (as just opening it in a browser will cause it to complain that the page isn't allowed to load files off the disk).

P.P.S. If you DO want to build it, you'll need to install NPM. Then, in the project directory, just do:
- "npm install" (to install the Node dependencies)
- "bower install" (to install the Bower dependencies)
- "gulp build" (to build it; the output goes in the "dist" folder)
And, er, I think that should work. Hopefully.