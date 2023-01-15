CREATE TABLE Audios(
	ID varchar(32),
	Title varchar(50),
	Singer varchar(50),
	Owner_ID varchar(50),
	PRIMARY KEY (ID),
	FOREIGN KEY (Owner_ID) REFERENCES USERS(ID)
);