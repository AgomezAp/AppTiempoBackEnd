import { Sequelize } from "sequelize";

const sequelize = new Sequelize('api_nodejs','root','1234',{
    host: 'localhost',
    dialect : 'mysql'
    
})

export default sequelize
