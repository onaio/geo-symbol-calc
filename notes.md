NEXT TASKS
====
Should have the migrations and model schem defined
- [ ] translate the migrations to a models in code.
- [ ] Make the following changes to the symbolConfig form page.
    - [ ] Creating a symbolConfig should send it to a svelte route that then commits it to the db.
    - [ ] Should be able to load symbol config from db for editing and save it.
    - [ ] Add urls to import and export configs from and to db.
        - [ ] For now store the apiToken on the db. we can take is an input on the form. it should be obscured though, and sent to the server via https post. (at the moment we do not support tls.)