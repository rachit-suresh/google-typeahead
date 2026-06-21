package com.typeahead.repository;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQueryEntity, Long> {

    @Query("SELECT s FROM SearchQueryEntity s WHERE LOWER(s.query) LIKE LOWER(CONCAT(:prefix, '%')) ORDER BY s.count DESC")
    List<SearchQueryEntity> findTopByPrefix(@Param("prefix") String prefix, Pageable pageable);
}
