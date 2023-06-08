
module.exports = {
    HOST: "localhost",
    USER: "root",
    PASSWORD: "123456",
    DB: "chessdb",
    dialect: "postgresql",
    pool: {
	max: 5,
	min: 0,
	acquire: 30000,
	idle: 10000
    }
};
