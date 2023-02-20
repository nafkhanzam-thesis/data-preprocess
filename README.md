# nafkhanzam-thesis/experiments

## Data Filling Steps

### Translation steps

|                         | **amr** | **amr_dfs** | **en** | **id** | **en_back** | **en_alt** | **id_alt** | **en_alt_back** |
| ----------------------- | ------- | ----------- | ------ | ------ | ----------- | ---------- | ---------- | --------------- |
| **LDC2017-test**        | 0       | 2           | 0      | 0      | -           | -          | -          | -               |
| **LDC2020-train-dev**   | 0       | 2           | 0      | 4      | 5           | 3          | 4          | 5               |
| **PANL-BPPT & IWSLT17** | 1       | 2           | 0      | 0      | -           | -          | -          | -               |

- 0: Available data.
- 1: AMR parse parallel corpora.
- 2: DFS linearize AMRs.
- 3: AMR-to-text AMRs to EN-ALTs as an alternative to ENs.
- 4: Translate ENs to IDs.
- 5: Translate IDs to ENs back.

### Inserting to database

All the translation results are then inserted to ScyllaDB.

### Evaluation steps

1. Encode each `en` and `id` sentences (except `back`) using LaBSE encoder.
2. Compute BLEU scores for each `en` and `en_back` pair.
3. Compute BLEU scores for `en` and `en_alt`.

## Filter dataset

The filtered data will be saved to `dataset` table.

### Training data filtration criterias

All:

- `data_source` == 'LDC2020'

Original sentences:

- `id__en__nn_rank` == 1

Alternative sentences:

- 0.1 < `en__en_alt__bleu` < 0.9
- `id_alt__en_alt__nn_rank` == 1

### Evaluate final dataset

- BLEU score: ~~Average of `en__en_back__bleu` and `en_alt__en_alt_back__bleu`.~~ Corpus-level BLEU score of all combined dataset.
- Cosine similarity: 1 - Average of `labse_distance` and `alt__labse_distance`.

## Schema

Dataset will be saved in a columnar database like Cassandra or Scylla.
I will be using ScyllaDB.

(I think this was a mistake, relational databases may suit better)

Key columns:

- `data_source` {LDC2017,LDC2020,PANL-BPPT,IWSLT17}
- `split` {train,dev,test}
- `idx` {0..*}

AMR columns:

- `amr`: PENMAN-format AMR.
- `amr_dfs`: DFS-format AMR.

Original sentence pairs:

- `en`: English sentence.
- `id`: Indonesian translation of `en`.
- `en__labse`: LaBSE-encoded `en`.
- `id__labse`: LaBSE-encoded `id`.
- `labse_distance`: The cosine distance of `en__labse` and `id__labse`.
- `id__en__nn_rank`: k-NN rank of the corresponding `en__labse` of `id__labse` among others.
- `en_back`: English translation back of `id`.
- `en__en_back__bleu`: BLEU score between `en` and `en_back`.

AMR-to-text sentence pairs:

- `en_alt`: AMR-to-text of `amr`.
- `id_alt`: Indonesian translation of `en_alt`.
- `en_alt__labse`: LaBSE-encoded `en_alt`.
- `id_alt__labse`: LaBSE-encoded `id_alt`.
- `alt__labse_distance`: The cosine distance of `en_alt__labse` and `id_alt__labse`.
- `id_alt__en__nn_rank`: k-NN rank of the corresponding `en_alt__labse` of `id_alt__labse` among others.
- `en_alt_back`: English translation back of `id_alt`.
- `en_alt__en_alt_back__bleu`: BLEU score between `en_alt` and `en_alt_back`.
- `en__en_alt__bleu`: BLEU score between `en` and `en_alt`.

### Data Definition

Keyspace:

```sql
CREATE KEYSPACE thesis
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
AND durable_writes = true;
```

Table:

```sql
CREATE TABLE data (
  data_source text,
  split text,
  idx int,

  amr text,
  amr_dfs text,

  en text,
  id text,
  en__labse list<double>,
  id__labse list<double>,
  labse_distance double,
  id__en__nn_rank int,
  en_back text,
  en__en_back__bleu double,

  en_alt text,
  id_alt text,
  en_alt__labse list<double>,
  id_alt__labse list<double>,
  alt__labse_distance double,
  id_alt__en_alt__nn_rank int,
  en_alt_back text,
  en_alt__en_alt_back__bleu double,

  en__en_alt__bleu double,

  PRIMARY KEY (data_source, split, idx)
);

CREATE TABLE dataset (
  data_source text,
  split text,
  source_type text, -- {original,alternative}
  idx int,

  amr text,
  amr_dfs text,

  en text,
  id text,
  labse_distance double,
  back_bleu double,

  PRIMARY KEY (data_source, split, source_type, idx)
);
```

Alternative Table for PostgreSQL:

```sql
CREATE UNLOGGED TABLE data (
  data_source text NOT NULL,
  split text NOT NULL,
  idx int NOT NULL,

  amr text,
  amr_dfs text,

  en text,
  id text,
  en__labse jsonb,
  id__labse jsonb,
  labse_distance double precision,
  id__en__nn_rank int,
  en_back text,
  en__en_back__bleu double precision,

  en_alt text,
  id_alt text,
  en_alt__labse jsonb,
  id_alt__labse jsonb,
  alt__labse_distance double precision,
  id_alt__en_alt__nn_rank int,
  en_alt_back text,
  en_alt__en_alt_back__bleu double precision,

  en__en_alt__bleu double precision,

  PRIMARY KEY (data_source, split, idx)
);

CREATE UNLOGGED TABLE dataset (
  data_source text,
  split text,
  source_type text, -- {original,alternative}
  idx int,

  amr text,
  amr_dfs text,

  en text,
  id text,
  labse_distance double precision,
  back_bleu double precision,

  PRIMARY KEY (data_source, split, source_type, idx)
);
```
