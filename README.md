# Atmosphere
A node.js server for storing audios that also has a web interface

For API's documentation please check out the wiki.
## Screenshots
![image](https://user-images.githubusercontent.com/82840553/220172693-c9e0083e-7983-44ad-a31b-c4f085f7927c.png)
![image](https://user-images.githubusercontent.com/82840553/220172843-48caf7f2-a776-4695-87df-e4d8c9bca857.png)
## Ideas
1. Lyrics support, something like musixmatch's. ( In research and development )
2. Live music broadcast or even voice call.
3. Utility APIs and tools in the interface.
4. Lyrics generator.
5. Custom key value pair data for developers to attach to audios or containers for use in other applications.
6. Sharing containers and audios between users.
7. Audio effect tool.
8. PWA App.
9. More verbose commands for reducing request frequency.
## In progress
### Containers
- [ ] API
  - [x] View
  - [ ] Edit
  - [ ] Delete
- [ ] Web Interface
  - [x] View
  - [ ] Edit
  - [ ] Delete
## Setup
### Requirements
- MySQL version 8
- Node.js 18
- Install dependencies via `npm install`
### Setting up the database
1. Create a database
2. Use the database and run [Users.sql](/setup/DB/Users.sql) file on your database to create a table for users
3. Do the same with [Audios.sql](/setup/DB/Audios.sql) file to create a table for audios
### Configuring the server
For setting it up you'll need to create a file named `.env` including information needed for the sever to get started.
The structure is like this:
```env
# Server configuration
PORT=6812 # The port that the program will listen on
# Database configuration
DB_NAME=
DB_ADDRESS= # e.g. localhost
DB_PORT=
DB_USER=
DB_PASSWORD= # If none it will connect without password
# JWT configuration
JWT_SECRET=
```
Please fill this out and save it.
And it's done. You can then go to the link generated by the program and make an account and use the web interface but please make sure your browser is up to date.
