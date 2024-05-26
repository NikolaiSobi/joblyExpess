"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobGetSchema = require("../schemas/jobGet.json")
const jobCreateSchema = require("../schemas/jobCreate.json")
const jobPatchSchema = require("../schemas/jobPatch.json")
const db = require("../db");

const router = new express.Router();


/** POST / { job } =>  { job }
 * Create a job posting
 *
 * job should be { title, companyHandle, salary, equity }
 *
 * Returns { id, title, companyHandle, salary, equity }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobCreateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { title, companyHandle, salary, id, equity }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity 
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let data = req.query
  let dataObj = {}
  let queryArr = []
  if (data.title) {
    queryArr.push(`LOWER(title) LIKE '%${data.title.toLowerCase()}%' `)
    dataObj.title = data.title
  }
  if (data.minSalary) {
    data.minSalary = parseInt(data.minSalary)
    queryArr.push(`salary > ${data.minSalary} `)
    dataObj.minSalary = data.minSalary
  }
  if (data.equity) {
    data.equity = true
    queryArr.push(`equity > 0 `)
    dataObj.equity = true
  }
  try {
    const validator = jsonschema.validate(dataObj, jobGetSchema)
    if(!validator.valid){
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const jobs = await Job.findAll(queryArr)
    return res.json({ jobs })

  } catch (error) {
      return next(error)
  }
})

/** GET /[id]  =>  { job }
 *
 *  Returns (id, title, salary, equity, companyHandle) where the id of the param = id of the job.
 * 
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { title, companyHandle, salary, equity }
 *
 * Authorization required: admin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobPatchSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  try {
    const job = await Job.remove(req.params.id);
    return res.json({ deleted: `${job.title} at company ${job.companyHandle}` });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
