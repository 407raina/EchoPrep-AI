import { randomUUID } from "crypto";
import { curatedJobSeeds } from "../data/curated-jobs";
import { query } from "../db/pool";

const insertOrUpdateCuratedJob = async () => {
  for (const seed of curatedJobSeeds) {
    const {
      externalId,
      company: {
        name,
        websiteUrl,
        logoUrl,
        industry,
        location,
        size,
        description,
      },
      job,
    } = seed;

    // Ensure company exists or update details
    const companyLookup = await query<{ id: string }>(
      "SELECT id FROM companies WHERE name = $1",
      [name]
    );

    let companyId: string;

    if (companyLookup.rowCount) {
      companyId = companyLookup.rows[0].id;
      await query(
        `UPDATE companies
         SET website_url = $2,
             logo_url = COALESCE($3, logo_url),
             industry = COALESCE($4, industry),
             location = COALESCE($5, location),
             size = COALESCE($6, size),
             description = COALESCE($7, description)
         WHERE id = $1`,
        [companyId, websiteUrl, logoUrl ?? null, industry ?? null, location ?? null, size ?? null, description ?? null]
      );
    } else {
      companyId = randomUUID();
      await query(
        `INSERT INTO companies (id, name, website_url, logo_url, industry, location, size, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, name, websiteUrl, logoUrl ?? null, industry ?? null, location ?? null, size ?? null, description ?? null]
      );
    }

    const existingJob = await query<{ id: string }>(
      "SELECT id FROM jobs WHERE external_id = $1",
      [externalId]
    );

    const requirements = job.requirements ?? null;
    const responsibilities = job.responsibilities ?? null;
    const benefits = job.benefits ?? null;

    if (existingJob.rowCount) {
      await query(
        `UPDATE jobs
         SET company_id = $2,
             title = $3,
             location = $4,
             job_type = $5,
             experience_level = $6,
             salary_min = $7,
             salary_max = $8,
             salary_currency = $9,
             description = $10,
             requirements = $11,
             responsibilities = $12,
             benefits = $13,
             posted_date = $14,
             application_url = $15,
             is_active = true,
             source = $16,
             updated_at = NOW()
         WHERE external_id = $1`,
        [
          externalId,
          companyId,
          job.title,
          job.location,
          job.jobType ?? null,
          job.experienceLevel ?? null,
          job.salaryMin ?? null,
          job.salaryMax ?? null,
          job.salaryCurrency ?? "USD",
          job.description,
          requirements,
          responsibilities,
          benefits,
          job.postedDate,
          job.applicationUrl,
          job.source,
        ]
      );
    } else {
      await query(
        `INSERT INTO jobs (
           id,
           company_id,
           title,
           location,
           job_type,
           experience_level,
           salary_min,
           salary_max,
           salary_currency,
           description,
           requirements,
           responsibilities,
           benefits,
           posted_date,
           application_url,
           is_active,
           external_id,
           source
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16, $17
         )`,
        [
          randomUUID(),
          companyId,
          job.title,
          job.location,
          job.jobType ?? null,
          job.experienceLevel ?? null,
          job.salaryMin ?? null,
          job.salaryMax ?? null,
          job.salaryCurrency ?? "USD",
          job.description,
          requirements,
          responsibilities,
          benefits,
          job.postedDate,
          job.applicationUrl,
          externalId,
          job.source,
        ]
      );
    }
  }
};

let seedingPromise: Promise<void> | null = null;

export const ensureCuratedJobsSeeded = async () => {
  if (!seedingPromise) {
    seedingPromise = insertOrUpdateCuratedJob().finally(() => {
      seedingPromise = null;
    });
  }

  return seedingPromise;
};

export const seedCuratedJobs = async () => {
  await insertOrUpdateCuratedJob();
};
