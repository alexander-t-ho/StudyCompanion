class EnablePgvectorExtension < ActiveRecord::Migration[7.1]
  def change
    # Temporarily disabled - pgvector extension needs to be installed in PostgreSQL
    # To enable: brew install pgvector, then restart PostgreSQL
    # enable_extension 'vector'
  end
end

