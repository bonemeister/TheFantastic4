CREATE TABLE Patients(
	PatientID INT PRIMARY KEY FOREIGN KEY REFERENCES Users(UserID),
	MRN NVARCHAR(10) UNIQUE, --will hold the 'medical record number' (idk what to set to 10 is ok for now)
	DOB DATE,
	BloodType NVARCHAR(3),
	Allergies NVARCHAR(max),
	CaregiverID INT NULL FOREIGN KEY REFERENCES Users(UserID) 
);