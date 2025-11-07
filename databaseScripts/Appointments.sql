CREATE TABLE Appointments(
    AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT FOREIGN KEY REFERENCES Patients(PatientID),
    CaregiverID INT FOREIGN KEY REFERENCES Users(UserID),
    AppointmentDate DATETIME NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Scheduled',
    Notes NVARCHAR(200)
);
