CREATE TABLE Audios(
	ID varchar(32),
	Title varchar(50),
	Singer varchar(50),
	Container_ID varchar(50),
	Format ENUM('mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'),
	Owner_ID varchar(50),
	PRIMARY KEY (ID),
	FOREIGN KEY (Owner_ID) REFERENCES Users(ID)
);
