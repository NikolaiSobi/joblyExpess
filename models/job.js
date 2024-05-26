"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
    /** Create a job (from data), update db, return new job data.
   *
   * data should be { id, title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if company already in database.
   * */
    static async create(data) {
      const result = await db.query(
            `INSERT INTO jobs (title,
                               salary,
                               equity,
                               company_handle)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
          [
            data.title,
            data.salary,
            data.equity,
            data.companyHandle,
          ]);
      let job = result.rows[0];
  
      return job;
    }

    /** Find all jobs.
     *
     * Returns [{ id, title, salary, equity, company_handle }, ...]
     * */

  static async findAll(queryArr) {
    let queryString = ''
    if(queryArr.length > 0){
      queryString = 'WHERE '
      for(let i = 0; i< queryArr.length; i++){
        if(i == 0) queryString += queryArr[i]
        else if(i > 0) queryString += `AND ${queryArr[i]}`
      }
    }
    const jobsRes = await db.query(
          `SELECT title,
                  company_handle AS "companyHandle",
                  salary,
                  id,
                  equity
           FROM jobs
            ${queryString}`);
    return jobsRes.rows;
  }


  /** Given an id, return data about job.
   *
   * Returns { company_handle, title, id, salary, equity}
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle as "companyHandle"
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  // get all jobs where at specific company
  static async getCompanyJobs(companyHandle) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity
           FROM jobs
           WHERE company_handle = $1`,
        [companyHandle]);

    const jobs = jobRes.rows;
    console.log(jobs)


    if (!jobs) throw new NotFoundError(`No jobs at: ${companyHandle}`);

    return jobs;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   *
   * Returns {title, companyHandle, salary, equity}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          companyHandle: "company_handle"
        });

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${id} 
                      RETURNING 
                                title, 
                                company_handle AS "companyHandle",
                                salary, 
                                equity`;
    const result = await db.query(querySql, [...values]);
    const jobs = result.rows[0];

    if (!jobs) throw new NotFoundError(`No jobs: ${id}`);

    return jobs;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job id not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING title, company_handle as "companyHandle"`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job id: ${id}`);
    return job
  }
}


module.exports = Job;



