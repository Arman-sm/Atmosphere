CREATE TABLE Containers(
	ID varchar(50),
	Title varchar(50),
	Owner_ID varchar(50),
	Container_ID varchar(32),
	PRIMARY KEY (ID),
	FOREIGN KEY (Owner_ID) REFERENCES Users(ID)
);